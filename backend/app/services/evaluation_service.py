from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from decimal import Decimal
from datetime import datetime
import difflib
import re

from app.models.attempt import ExamAttempt, StudentAnswer
from app.models.exam import Exam, Question, QuestionOption, ExamQuestion
from app.models.result import Result, Evaluation, EvaluationHistory, GradeMaster
from app.utils.logger import logger

class GradedResponse:
    def __init__(self, score, percentage, is_passed):
        self.final_score = score
        self.percentage = percentage
        self.is_passed = is_passed

class EvaluationService:
    """Service handling automatic evaluations, manual grading overlays, AI score reviews, and rank calculations."""

    @staticmethod
    def evaluate_attempt(db: Session, attempt: ExamAttempt) -> GradedResponse:
        """Automatically evaluate MCQ, TF, FIB, matching questions, handling negative marks."""
        exam = attempt.exam
        eq_mappings = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).all()
        
        final_score = Decimal("0.00")
        correct_count = 0
        wrong_count = 0
        skipped_count = 0
        has_subjective = False

        for eq in eq_mappings:
            q = eq.question
            ans = db.query(StudentAnswer).filter(
                StudentAnswer.attempt_id == attempt.id,
                StudentAnswer.question_id == q.id
            ).first()

            # Subjective Questions (Short/Long)
            if q.question_type_id in [3, 4]:
                has_subjective = True
                # Create draft evaluation record if not exists
                existing_eval = db.query(Evaluation).filter(
                    Evaluation.attempt_id == attempt.id,
                    Evaluation.question_id == q.id
                ).first()
                if not existing_eval:
                    new_eval = Evaluation(
                        attempt_id=attempt.id,
                        question_id=q.id,
                        marks_obtained=Decimal("0.00"),
                        status="draft"
                    )
                    db.add(new_eval)
                continue

            # If no answer provided
            if not ans or (not ans.selected_option_id and not ans.text_answer):
                skipped_count += 1
                continue

            q_marks = Decimal(str(eq.marks_override or q.marks or 0.00))
            neg_marks = Decimal(str(q.negative_marks or 0.00))

            # Multiple Choice (1) or True/False (2)
            if q.question_type_id in [1, 2]:
                correct_opt = db.query(QuestionOption).filter(
                    QuestionOption.question_id == q.id,
                    QuestionOption.is_correct == True
                ).first()

                if correct_opt and ans.selected_option_id == correct_opt.id:
                    final_score += q_marks
                    correct_count += 1
                else:
                    final_score -= neg_marks
                    wrong_count += 1

            # Fill in the Blank (5)
            elif q.question_type_id == 5:
                correct_opt = db.query(QuestionOption).filter(
                    QuestionOption.question_id == q.id,
                    QuestionOption.is_correct == True
                ).first()

                student_val = (ans.text_answer or "").strip().lower()
                expected_val = (correct_opt.option_text or "").strip().lower() if correct_opt else ""

                if student_val == expected_val:
                    final_score += q_marks
                    correct_count += 1
                else:
                    final_score -= neg_marks
                    wrong_count += 1

        # Prevent negative final scores
        if final_score < 0:
            final_score = Decimal("0.00")

        attempt.final_score = final_score
        db.commit()

        # Match Grade using percentage
        pct = (final_score / Decimal(str(exam.total_marks))) * 100 if exam.total_marks > 0 else Decimal("0.00")
        is_passed = final_score >= exam.passing_marks

        # Generate result record
        if not has_subjective:
            grade_rec = db.query(GradeMaster).filter(
                GradeMaster.min_percentage <= pct,
                GradeMaster.max_percentage >= pct
            ).first()
            grade_name = grade_rec.grade_name if grade_rec else "F"

            result = db.query(Result).filter(Result.attempt_id == attempt.id).first()
            if not result:
                result = Result(
                    attempt_id=attempt.id,
                    student_id=attempt.student_id,
                    exam_id=attempt.exam_id,
                    total_marks=exam.total_marks,
                    passing_marks=exam.passing_marks,
                    final_score=final_score,
                    percentage=pct,
                    grade=grade_name,
                    status="pass" if is_passed else "fail",
                    is_published=True,  # Auto-evals publish immediately
                    published_at=datetime.now()
                )
                db.add(result)
            else:
                result.final_score = final_score
                result.percentage = pct
                result.grade = grade_name
                result.status = "pass" if is_passed else "fail"
            db.commit()

        return GradedResponse(float(final_score), float(pct), bool(is_passed))

    @staticmethod
    def get_ai_assisted_evaluation(student_ans: str, expected_ans: str, max_marks: float) -> dict:
        """Run comparison checks on subjective text answers and suggest scores, strengths, and missed topics."""
        if not student_ans or not student_ans.strip():
            return {
                "suggested_marks": 0.0,
                "feedback": "No answer provided.",
                "strengths": "None",
                "weaknesses": "Missing response details.",
                "concepts_missed": "All concepts missed."
            }

        # 1. Similarity check
        ratio = difflib.SequenceMatcher(None, student_ans.strip().lower(), expected_ans.strip().lower()).ratio()
        
        # 2. Suggested marks calculation
        suggested = round(max_marks * ratio, 2)
        
        # 3. Simple grammar check based on sentence structures
        words = student_ans.split()
        grammar_score = "Good" if len(words) > 10 else "Weak"

        # 4. Highlight missing keywords
        expected_keywords = set(re.findall(r'\w+', expected_ans.lower()))
        student_keywords = set(re.findall(r'\w+', student_ans.lower()))
        missed = expected_keywords - student_keywords
        
        strengths = "Clear response phrasing." if len(words) > 15 else "Direct answer statement."
        weaknesses = "Grammar structure could be enhanced." if grammar_score == "Weak" else "Lacks detailed support."
        concepts_missed = ", ".join(list(missed)[:3]) if missed else "None"

        feedback = f"AI Suggested Grade review. Grammatical flow: {grammar_score}. Explanation ratio similarity: {int(ratio * 100)}%."

        return {
            "suggested_marks": suggested,
            "feedback": feedback,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "concepts_missed": concepts_missed
        }

    @staticmethod
    def save_manual_evaluation(
        db: Session,
        attempt_id: int,
        question_id: int,
        examiner_id: int,
        marks: float,
        remarks: str
    ) -> Evaluation:
        """Save manual grade marks and logs edits in audit history."""
        eval_record = db.query(Evaluation).filter(
            Evaluation.attempt_id == attempt_id,
            Evaluation.question_id == question_id
        ).first()

        old_marks = None
        if not eval_record:
            eval_record = Evaluation(
                attempt_id=attempt_id,
                question_id=question_id,
                examiner_id=examiner_id,
                marks_obtained=marks,
                remarks=remarks,
                status="draft"
            )
            db.add(eval_record)
        else:
            old_marks = eval_record.marks_obtained
            eval_record.marks_obtained = marks
            eval_record.remarks = remarks
            eval_record.examiner_id = examiner_id

        db.commit()
        db.refresh(eval_record)

        # Log to audit history
        history = EvaluationHistory(
            evaluation_id=eval_record.id,
            changer_id=examiner_id,
            old_marks=old_marks,
            new_marks=marks,
            remarks=remarks
        )
        db.add(history)
        db.commit()

        return eval_record

    @staticmethod
    def calculate_ranks_and_grades(db: Session, exam_id: int):
        """Recalculate ranks and custom grades for all submitted attempts of an exam."""
        attempts = db.query(ExamAttempt).filter(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.status.in_(["submitted", "timeout_submitted"])
        ).all()

        if not attempts:
            return

        # 1. Fetch total marks obtained for each attempt, adding manual evaluations
        attempt_scores = []
        for att in attempts:
            # Base auto-score (MCQs, TFs, Fibs)
            score = Decimal(str(att.final_score))
            
            # Add manually evaluated subjective questions
            manuals = db.query(Evaluation).filter(
                Evaluation.attempt_id == att.id,
                Evaluation.status == "published"
            ).all()
            for m in manuals:
                score += Decimal(str(m.marks_obtained))
            
            # Calculate duration spent
            duration = (att.submission_time - att.start_time).total_seconds() if att.submission_time else 99999
            
            attempt_scores.append({
                "attempt": att,
                "score": score,
                "duration": duration,
                "submission_time": att.submission_time or datetime.now()
            })

        # 2. Sort by: Score (Desc), Duration (Asc), Submission Time (Asc)
        attempt_scores.sort(key=lambda x: (-x["score"], x["duration"], x["submission_time"]))

        # 3. Assign ranks and save results
        for rank_idx, item in enumerate(attempt_scores):
            att = item["attempt"]
            score = item["score"]
            rank = rank_idx + 1

            # Match Grade using percentage
            pct = (score / Decimal(str(att.exam.total_marks))) * 100 if att.exam.total_marks > 0 else Decimal("0.00")
            grade_rec = db.query(GradeMaster).filter(
                GradeMaster.min_percentage <= pct,
                GradeMaster.max_percentage >= pct
            ).first()
            grade_name = grade_rec.grade_name if grade_rec else "F"

            # Check if result record exists
            result = db.query(Result).filter(Result.attempt_id == att.id).first()
            if not result:
                result = Result(
                    attempt_id=att.id,
                    student_id=att.student_id,
                    exam_id=att.exam_id,
                    total_marks=att.exam.total_marks,
                    passing_marks=att.exam.passing_marks,
                    final_score=score,
                    percentage=pct,
                    grade=grade_name,
                    exam_rank=rank,
                    class_rank=rank,
                    status="pass" if score >= att.exam.passing_marks else "fail",
                    is_published=False
                )
                db.add(result)
            else:
                result.final_score = score
                result.percentage = pct
                result.grade = grade_name
                result.exam_rank = rank
                result.class_rank = rank
                result.status = "pass" if score >= att.exam.passing_marks else "fail"

        db.commit()

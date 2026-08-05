from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, UTC
from typing import List, Optional

from app.models.attempt import ExamAttempt, StudentAnswer, BrowserActivityLog, ExamSession
from app.models.exam import Exam, StudentExamAssignment, Question

class AttemptRepository:
    """Repository handling CRUD operations for exam attempts, saved responses and browser violations."""

    @staticmethod
    def get_student_dashboard_stats(db: Session, student_id: int) -> dict:
        """Fetch aggregations for student dashboard (available, completed, scores)."""
        now = datetime.now()
        
        # 1. Total assigned/available exams
        total_assigned = db.query(StudentExamAssignment).filter(
            StudentExamAssignment.student_id == student_id,
            StudentExamAssignment.status == "assigned"
        ).count()

        # 2. Completed attempts
        completed_attempts = db.query(ExamAttempt).filter(
            ExamAttempt.student_id == student_id,
            ExamAttempt.status.in_(["submitted", "timeout_submitted"])
        ).count()

        # 3. Recent results
        recent_attempts = db.query(ExamAttempt).filter(
            ExamAttempt.student_id == student_id,
            ExamAttempt.status.in_(["submitted", "timeout_submitted"])
        ).options(
            joinedload(ExamAttempt.exam)
        ).order_by(ExamAttempt.submission_time.desc()).limit(5).all()

        return {
            "total_assigned": total_assigned,
            "completed_attempts": completed_attempts,
            "recent_results": recent_attempts
        }

    @staticmethod
    def get_student_exams_list(db: Session, student_id: int) -> List[dict]:
        """Retrieve assigned exams alongside active attempts mapping status."""
        assignments = db.query(StudentExamAssignment).filter(
            StudentExamAssignment.student_id == student_id
        ).options(
            joinedload(StudentExamAssignment.exam).joinedload(Exam.subject)
        ).all()

        results = []
        for a in assignments:
            exam = a.exam
            if not exam:
                continue

            # Fetch active attempt if exists
            attempt = db.query(ExamAttempt).filter(
                ExamAttempt.student_id == student_id,
                ExamAttempt.exam_id == exam.id
            ).order_by(ExamAttempt.created_at.desc()).first()

            results.append({
                "assignment_id": a.id,
                "exam_id": exam.id,
                "name": exam.name,
                "code": exam.code,
                "subject_name": exam.subject.subject_name,
                "subject_code": exam.subject.subject_code,
                "duration_minutes": exam.duration_minutes,
                "total_marks": float(exam.total_marks),
                "passing_marks": float(exam.passing_marks),
                "start_date": exam.start_date,
                "end_date": exam.end_date,
                "status": a.status,
                "attempt_status": attempt.status if attempt else "not_started",
                "attempt_id": attempt.id if attempt else None,
                "score": float(attempt.final_score) if (attempt and attempt.status in ("submitted", "timeout_submitted")) else None
            })

        return results

    @staticmethod
    def get_attempt_by_id(db: Session, attempt_id: int) -> Optional[ExamAttempt]:
        """Fetch exam attempt including text answers and questions mapped."""
        return db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).options(
            joinedload(ExamAttempt.exam),
            joinedload(ExamAttempt.answers).joinedload(StudentAnswer.question)
        ).first()

    @staticmethod
    def get_active_attempt(db: Session, student_id: int, exam_id: int) -> Optional[ExamAttempt]:
        """Fetch active in-progress exam attempt."""
        return db.query(ExamAttempt).filter(
            ExamAttempt.student_id == student_id,
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.status == "started"
        ).first()

    @staticmethod
    def save_student_answer(
        db: Session,
        attempt_id: int,
        question_id: int,
        selected_option_id: Optional[int] = None,
        text_answer: Optional[str] = None,
        time_spent_seconds: int = 0,
        is_marked_for_review: bool = False
    ) -> StudentAnswer:
        """Update or insert student response slot for a question."""
        ans = db.query(StudentAnswer).filter(
            StudentAnswer.attempt_id == attempt_id,
            StudentAnswer.question_id == question_id
        ).first()

        if not ans:
            ans = StudentAnswer(
                attempt_id=attempt_id,
                question_id=question_id,
                selected_option_id=selected_option_id,
                text_answer=text_answer,
                time_spent_seconds=time_spent_seconds,
                is_marked_for_review=is_marked_for_review
            )
            db.add(ans)
        else:
            ans.selected_option_id = selected_option_id
            ans.text_answer = text_answer
            ans.time_spent_seconds += time_spent_seconds
            ans.is_marked_for_review = is_marked_for_review

        db.commit()
        db.refresh(ans)
        return ans

    @staticmethod
    def log_browser_violation(db: Session, attempt_id: int, violation_type: str, description: str):
        """Register security violations in audit trail."""
        log = BrowserActivityLog(
            attempt_id=attempt_id,
            violation_type=violation_type,
            description=description
        )
        db.add(log)
        db.commit()

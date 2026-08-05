from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.auth.dependencies import get_current_active_user, RoleChecker
from app.models.attempt import ExamAttempt, StudentAnswer
from app.models.exam import Exam, Question, ExamQuestion, QuestionOption
from app.models.result import Result, Evaluation
from app.models.domain import User
from app.services.evaluation_service import EvaluationService
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/evaluation", tags=["Examiner Evaluations"])

admin_access = RoleChecker(["admin", "super_admin"])

# --- Request / Response Schemas ---
class SaveManualGradeRequest(BaseModel):
    attempt_id: int
    question_id: int
    marks_obtained: float = Field(..., ge=0)
    remarks: Optional[str] = ""

class PublishEvaluationRequest(BaseModel):
    attempt_id: int

class AIReviewRequest(BaseModel):
    attempt_id: int
    question_id: int

# --- Endpoints ---

@router.get("/pending")
def list_pending_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Retrieve list of student exam attempts awaiting manual grading of subjective answers."""
    # Fetch attempts with short/long/programming questions
    attempts = db.query(ExamAttempt).options(
        joinedload(ExamAttempt.student),
        joinedload(ExamAttempt.exam).joinedload(Exam.subject)
    ).filter(
        ExamAttempt.status.in_(["submitted", "timeout_submitted"])
    ).all()

    pending_list = []
    for att in attempts:
        # Check if contains subjective questions
        has_subjective = db.query(ExamQuestion).join(Question).filter(
            ExamQuestion.exam_id == att.exam_id,
            Question.question_type_id.in_([3, 4])  # Short (3) or Essay (4)
        ).count() > 0

        # Check if already published
        result = db.query(Result).filter(Result.attempt_id == att.id).first()
        is_published = result.is_published if result else False

        if has_subjective and not is_published:
            pending_list.append({
                "attempt_id": att.id,
                "student_name": f"{att.student.first_name} {att.student.last_name}",
                "student_email": att.student.email,
                "exam_name": att.exam.name,
                "exam_code": att.exam.code,
                "subject_name": att.exam.subject.subject_name,
                "submission_time": att.submission_time
            })

    return ApiResponse(
        success=True,
        message="Pending evaluations queue loaded",
        data=pending_list
    )

@router.get("/{attempt_id}")
def get_attempt_answers_for_grading(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Retrieve all student responses for an attempt (including automatic scores and expected key details)."""
    attempt = db.query(ExamAttempt).options(
        joinedload(ExamAttempt.student),
        joinedload(ExamAttempt.exam).joinedload(Exam.subject)
    ).filter(ExamAttempt.id == attempt_id).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")

    answers_list = []
    # Loop questions mapping
    eq_mappings = db.query(ExamQuestion).filter(ExamQuestion.exam_id == attempt.exam_id).all()
    for eq in eq_mappings:
        q = eq.question
        ans = db.query(StudentAnswer).filter(
            StudentAnswer.attempt_id == attempt_id,
            StudentAnswer.question_id == q.id
        ).first()

        correct_opt = db.query(QuestionOption).filter(
            QuestionOption.question_id == q.id,
            QuestionOption.is_correct == True
        ).first()

        eval_record = db.query(Evaluation).filter(
            Evaluation.attempt_id == attempt_id,
            Evaluation.question_id == q.id
        ).first()

        answers_list.append({
            "question_id": q.id,
            "title": q.title,
            "description": q.description,
            "question_type_id": q.question_type_id,
            "max_marks": float(eq.marks_override or q.marks),
            "student_answer_text": ans.text_answer if ans else "",
            "expected_answer_text": correct_opt.option_text if correct_opt else "No model answer provided",
            "marks_obtained": float(eval_record.marks_obtained) if eval_record else None,
            "remarks": eval_record.remarks if eval_record else ""
        })

    return ApiResponse(
        success=True,
        message="Attempt answers loaded for grading",
        data={
            "attempt_id": attempt.id,
            "student_name": f"{attempt.student.first_name} {attempt.student.last_name}",
            "exam_name": attempt.exam.name,
            "questions": answers_list
        }
    )

@router.post("/save")
def save_manual_grade(
    payload: SaveManualGradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Save manual grading score draft for a subjective answer."""
    eval_record = EvaluationService.save_manual_evaluation(
        db=db,
        attempt_id=payload.attempt_id,
        question_id=payload.question_id,
        examiner_id=current_user.id,
        marks=payload.marks_obtained,
        remarks=payload.remarks
    )
    return ApiResponse(
        success=True,
        message="Grading mark draft saved successfully",
        data={
            "evaluation_id": eval_record.id,
            "marks_obtained": float(eval_record.marks_obtained)
        }
    )

@router.post("/ai-review")
def get_ai_evaluation_suggestion(
    payload: AIReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Trigger AI assessment logic checking correctness ratios and grammar feedback reviews."""
    ans = db.query(StudentAnswer).filter(
        StudentAnswer.attempt_id == payload.attempt_id,
        StudentAnswer.question_id == payload.question_id
    ).first()

    correct_opt = db.query(QuestionOption).filter(
        QuestionOption.question_id == payload.question_id,
        QuestionOption.is_correct == True
    ).first()

    eq = db.query(ExamQuestion).filter(
        ExamQuestion.question_id == payload.question_id
    ).first()

    if not ans:
        raise HTTPException(status_code=404, detail="Student response not found")

    student_ans = ans.text_answer or ""
    expected_ans = correct_opt.option_text if correct_opt else ""
    max_marks = float(eq.marks_override or eq.question.marks) if eq else 5.0

    review = EvaluationService.get_ai_assisted_evaluation(student_ans, expected_ans, max_marks)

    # Save to draft AI feedback inside evaluation
    eval_record = db.query(Evaluation).filter(
        Evaluation.attempt_id == payload.attempt_id,
        Evaluation.question_id == payload.question_id
    ).first()

    if not eval_record:
        eval_record = Evaluation(
            attempt_id=payload.attempt_id,
            question_id=payload.question_id,
            ai_suggested_marks=review["suggested_marks"],
            ai_feedback=review["feedback"]
        )
        db.add(eval_record)
    else:
        eval_record.ai_suggested_marks = review["suggested_marks"]
        eval_record.ai_feedback = review["feedback"]
    
    db.commit()

    return ApiResponse(
        success=True,
        message="AI review completed successfully",
        data=review
    )

@router.post("/publish")
def publish_evaluation_marks(
    payload: PublishEvaluationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Finalize manual grading reviews, publish result aggregates, and calculate ranks."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == payload.attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Shift all draft evaluations to published status
    evals = db.query(Evaluation).filter(Evaluation.attempt_id == payload.attempt_id).all()
    for ev in evals:
        ev.status = "published"

    db.commit()

    # Recalculate ranks and grades for all student attempts in this exam template
    EvaluationService.calculate_ranks_and_grades(db, attempt.exam_id)

    # Set published flag inside result
    res = db.query(Result).filter(Result.attempt_id == payload.attempt_id).first()
    if res:
        res.is_published = True
        res.published_at = datetime.now()
        db.commit()

    return ApiResponse(
        success=True,
        message="Exam evaluation published successfully",
        data={}
    )

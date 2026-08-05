from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta, UTC
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.auth.dependencies import get_current_active_user, RoleChecker
from app.models.attempt import ExamAttempt, StudentAnswer, BrowserActivityLog, ExamSession
from app.models.exam import Exam, StudentExamAssignment, Question, QuestionOption, ExamQuestion
from app.models.domain import User
from app.repositories.attempt_repository import AttemptRepository
from app.services.evaluation_service import EvaluationService
from app.services.import_export_service import ImportExportService
from app.schemas.schemas import ApiResponse
from app.services.audit import log_security_event

router = APIRouter(prefix="/student", tags=["Student Exam Portal"])

student_access = RoleChecker(["student"])
any_auth = get_current_active_user

# --- Request / Response Pydantic DTOs ---
class StartAttemptRequest(BaseModel):
    exam_id: int

class SaveAnswerRequest(BaseModel):
    attempt_id: int
    question_id: int
    selected_option_id: Optional[int] = None
    text_answer: Optional[str] = None
    time_spent_seconds: int = 0
    is_marked_for_review: bool = False

class SubmitAttemptRequest(BaseModel):
    attempt_id: int

class LogViolationRequest(BaseModel):
    attempt_id: int
    violation_type: str
    description: str

# --- Endpoints ---

@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(student_access)
):
    """Retrieve statistics for the student dashboard."""
    stats = AttemptRepository.get_student_dashboard_stats(db, current_user.id)
    
    recent = []
    for r in stats["recent_results"]:
        recent.append({
            "id": r.id,
            "exam_name": r.exam.name,
            "score": float(r.final_score),
            "percentage": float(r.percentage),
            "is_passed": r.is_passed,
            "submission_time": r.submission_time
        })

    return ApiResponse(
        success=True,
        message="Dashboard stats loaded",
        data={
            "upcoming_exams": stats["total_assigned"],
            "completed_exams": stats["completed_attempts"],
            "recent_results": recent,
            "profile_completion": 85,  # Placeholder completion rate
            "accessibility_preference": current_user.student_profile.accessibility_requirement.name if current_user.student_profile else "none"
        }
    )

@router.get("/exams")
def get_student_assigned_exams(
    db: Session = Depends(get_db),
    current_user: User = Depends(student_access)
):
    """Retrieve list of assigned examinations for the student."""
    exams = AttemptRepository.get_student_exams_list(db, current_user.id)
    return ApiResponse(
        success=True,
        message="Student assigned exams loaded",
        data=exams
    )

@router.get("/exams/{exam_id}")
def get_exam_details_for_taking(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(student_access)
):
    """Retrieve exam configurations and questions (Hiding correct answers)."""
    # Verify assignment
    assign = db.query(StudentExamAssignment).filter(
        StudentExamAssignment.student_id == current_user.id,
        StudentExamAssignment.exam_id == exam_id
    ).first()
    
    if not assign:
        raise HTTPException(status_code=403, detail="You are not assigned to this exam.")

    exam = db.query(Exam).filter(Exam.id == exam_id).options(
        joinedload(Exam.subject),
        joinedload(Exam.questions).joinedload(ExamQuestion.question).joinedload(Question.options)
    ).first()

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Format questions list, stripping correct answers flag for security
    question_records = []
    for eq in exam.questions:
        q = eq.question
        opts = []
        for o in q.options:
            opts.append({
                "id": o.id,
                "option_text": o.option_text,
                "display_order": o.display_order
            })
            
        question_records.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "question_type_id": q.question_type_id,
            "marks": float(eq.marks_override or q.marks),
            "options": opts
        })

    return ApiResponse(
        success=True,
        message="Exam configuration details loaded",
        data={
            "id": exam.id,
            "name": exam.name,
            "code": exam.code,
            "instructions": exam.instructions,
            "duration_minutes": exam.duration_minutes,
            "total_marks": float(exam.total_marks),
            "passing_marks": float(exam.passing_marks),
            "randomize_questions": exam.randomize_questions,
            "randomize_options": exam.randomize_options,
            "calculator_allowed": exam.calculator_allowed,
            "voice_navigation_availability": exam.voice_navigation_availability,
            "questions": question_records
        }
    )

@router.post("/exams/start")
def start_exam_attempt(
    payload: StartAttemptRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(student_access)
):
    """Start or resume a student exam attempt session."""
    exam = db.query(Exam).filter(Exam.id == payload.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # 1. Verify date window
    now = datetime.now()
    if now < exam.start_date or now > exam.end_date:
        raise HTTPException(status_code=400, detail="Exam window is currently closed.")

    # 2. Check if student is assigned
    assign = db.query(StudentExamAssignment).filter(
        StudentExamAssignment.student_id == current_user.id,
        StudentExamAssignment.exam_id == payload.exam_id
    ).first()
    if not assign:
        raise HTTPException(status_code=403, detail="You are not assigned to this exam.")

    # 3. Check resume state
    active = AttemptRepository.get_active_attempt(db, current_user.id, payload.exam_id)
    if active:
        # Check timer remaining
        time_left = (active.end_time - datetime.now()).total_seconds()
        if time_left <= 0:
            # Auto-submit expired attempt
            active.status = "timeout_submitted"
            EvaluationService.evaluate_attempt(db, active)
            raise HTTPException(status_code=400, detail="Active attempt expired and has been submitted.")
        
        # Return active attempt details
        return ApiResponse(
            success=True,
            message="Resumed active exam session",
            data={
                "attempt_id": active.id,
                "status": active.status,
                "seconds_remaining": int(time_left)
            }
        )

    # 4. Check attempts count limit
    attempts_count = db.query(ExamAttempt).filter(
        ExamAttempt.student_id == current_user.id,
        ExamAttempt.exam_id == payload.exam_id
    ).count()
    
    if attempts_count >= exam.max_attempts:
        raise HTTPException(status_code=400, detail="You have exceeded the maximum attempts for this exam.")

    # 5. Create new attempt
    end_time = datetime.now() + timedelta(minutes=exam.duration_minutes)
    attempt = ExamAttempt(
        student_id=current_user.id,
        exam_id=payload.exam_id,
        start_time=datetime.now(),
        end_time=end_time,
        status="started"
    )
    db.add(attempt)
    
    # Increment assignment attempt count safely
    assign.attempt_count = (assign.attempt_count or 0) + 1
    assign.status = "started"
    
    db.commit()
    db.refresh(attempt)

    log_security_event(db, user_id=current_user.id, action=f"Exam Attempt Started: {exam.code}", request=request)

    return ApiResponse(
        success=True,
        message="Exam attempt session started successfully",
        data={
            "attempt_id": attempt.id,
            "status": attempt.status,
            "seconds_remaining": exam.duration_minutes * 60
        }
    )

@router.post("/exams/save-answer")
def save_answer(
    payload: SaveAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(student_access)
):
    """Save or update student answer inputs (Auto-save)."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == payload.attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
        raise HTTPException(status_code=404, detail="Exam attempt session not found.")

    if attempt.status != "started":
        raise HTTPException(status_code=400, detail="Cannot save answer. Attempt has already been submitted.")

    # Check timeout
    if datetime.now() > attempt.end_time:
        attempt.status = "timeout_submitted"
        EvaluationService.evaluate_attempt(db, attempt)
        raise HTTPException(status_code=400, detail="Timer expired. Exam has been auto-submitted.")

    # Save
    ans = AttemptRepository.save_student_answer(
        db=db,
        attempt_id=payload.attempt_id,
        question_id=payload.question_id,
        selected_option_id=payload.selected_option_id,
        text_answer=payload.text_answer,
        time_spent_seconds=payload.time_spent_seconds,
        is_marked_for_review=payload.is_marked_for_review
    )

    return ApiResponse(
        success=True,
        message="Answer auto-saved",
        data={"last_saved": ans.last_saved_at}
    )

@router.post("/exams/violation")
def log_violation(
    payload: LogViolationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(student_access)
):
    """Log browser window blurs or full screen exits security violations."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == payload.attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
         raise HTTPException(status_code=404, detail="Attempt not found.")

    AttemptRepository.log_browser_violation(
        db=db,
        attempt_id=payload.attempt_id,
        violation_type=payload.violation_type,
        description=payload.description
    )

    return ApiResponse(
        success=True,
        message="Violation logged successfully",
        data={}
    )

@router.post("/exams/submit")
def submit_exam_attempt(
    payload: SubmitAttemptRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(student_access)
):
    """Finalize student exam attempt and run evaluation algorithms."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == payload.attempt_id).first()
    if not attempt or attempt.student_id != current_user.id:
         raise HTTPException(status_code=404, detail="Attempt not found.")

    if attempt.status != "started":
        raise HTTPException(status_code=400, detail="Attempt was already submitted.")

    # Mark submitted and grade
    attempt.status = "submitted"
    graded = EvaluationService.evaluate_attempt(db, attempt)

    # Update assignment status
    assign = db.query(StudentExamAssignment).filter(
        StudentExamAssignment.student_id == current_user.id,
        StudentExamAssignment.exam_id == attempt.exam_id
    ).first()
    if assign:
        assign.status = "completed"
        
    db.commit()

    log_security_event(db, user_id=current_user.id, action=f"Exam Attempt Submitted: ID {attempt.id}", request=request)

    return ApiResponse(
        success=True,
        message="Exam submitted and graded successfully",
        data={
            "score": float(graded.final_score),
            "percentage": float(graded.percentage),
            "is_passed": graded.is_passed
        }
    )

@router.get("/results")
def get_completed_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(any_auth)
):
    """Retrieve list of all completed/submitted exams with grades."""
    # Let students see their own, and admins see all
    query = db.query(ExamAttempt).options(
        joinedload(ExamAttempt.exam).joinedload(Exam.subject)
    ).filter(ExamAttempt.status.in_(["submitted", "timeout_submitted"]))

    if current_user.role_id == 2:  # Student
        query = query.filter(ExamAttempt.student_id == current_user.id)

    attempts = query.all()
    results = []
    for a in attempts:
        results.append({
            "id": a.id,
            "exam_name": a.exam.name,
            "exam_code": a.exam.code,
            "subject_name": a.exam.subject.subject_name,
            "final_score": float(a.final_score),
            "percentage": float(a.percentage),
            "is_passed": a.is_passed,
            "submission_time": a.submission_time
        })

    return ApiResponse(
        success=True,
        message="Results directory loaded",
        data=results
    )

@router.get("/results/{attempt_id}")
def get_result_details(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(any_auth)
):
    """Fetch scores details summary including questions keys."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).options(
        joinedload(ExamAttempt.exam).joinedload(Exam.subject),
        joinedload(ExamAttempt.answers).joinedload(StudentAnswer.question).joinedload(Question.options)
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Result attempt not found.")

    if current_user.role_id == 2 and attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden. Access restricted.")

    # Format answers sheet
    answers_sheet = []
    for ans in attempt.answers:
        q = ans.question
        correct_opt = next((o.option_text for o in q.options if o.is_correct), "N/A")
        selected_text = ans.selected_option.option_text if ans.selected_option else (ans.text_answer or "Skipped")
        
        answers_sheet.append({
            "question_title": q.title,
            "question_type_id": q.question_type_id,
            "selected_answer": selected_text,
            "correct_answer": correct_opt,
            "time_spent_seconds": ans.time_spent_seconds
        })

    return ApiResponse(
        success=True,
        message="Result details loaded",
        data={
            "exam_name": attempt.exam.name,
            "subject_name": attempt.exam.subject.subject_name,
            "final_score": float(attempt.final_score),
            "percentage": float(attempt.percentage),
            "is_passed": attempt.is_passed,
            "submission_time": attempt.submission_time,
            "answers": answers_sheet
        }
    )

@router.get("/results/{attempt_id}/pdf")
def download_result_pdf(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(any_auth)
):
    """Download result details PDF report."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).options(
        joinedload(ExamAttempt.exam).joinedload(Exam.subject),
        joinedload(ExamAttempt.answers).joinedload(StudentAnswer.question)
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Result not found.")

    if current_user.role_id == 2 and attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden.")

    # PDF Document Construction
    buffer = io.BytesIO()
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        name='PDFTitleStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#4F46E5'),
        spaceAfter=15
    )
    bold_style = ParagraphStyle(
        name='PDFBoldStyle',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )

    story = []
    story.append(Paragraph("Aegis Examination Portal - Official Report Card", title_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"<b>Student Name:</b> {attempt.student.first_name} {attempt.student.last_name}", bold_style))
    story.append(Paragraph(f"<b>Exam:</b> {attempt.exam.name} ({attempt.exam.code})", bold_style))
    story.append(Paragraph(f"<b>Subject:</b> {attempt.exam.subject.subject_name}", bold_style))
    story.append(Paragraph(f"<b>Final Score:</b> {float(attempt.final_score)} / {float(attempt.exam.total_marks)}", bold_style))
    story.append(Paragraph(f"<b>Percentage:</b> {float(attempt.percentage)}%", bold_style))
    story.append(Paragraph(f"<b>Outcome:</b> {'PASSED' if attempt.is_passed else 'FAILED'}", bold_style))
    story.append(Paragraph(f"<b>Submission Time:</b> {attempt.submission_time.strftime('%Y-%m-%d %H:%M:%S') if attempt.submission_time else 'N/A'}", bold_style))
    
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=result_{attempt_id}.pdf"}
    )

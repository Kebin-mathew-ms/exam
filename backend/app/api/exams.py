from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.database.session import get_db
from app.auth.dependencies import RoleChecker
from app.models.exam import Exam, ExamQuestion, Subject
from app.repositories.exam_repository import ExamRepository
from app.schemas.exam_schemas import ExamCreate, ExamResponse
from app.schemas.schemas import ApiResponse, PaginatedResponse
from app.services.audit import log_security_event

router = APIRouter(prefix="/admin/exams", tags=["Exam Management"])

admin_access = RoleChecker(["admin", "super_admin"])

@router.get("", response_model=ApiResponse[PaginatedResponse[ExamResponse]])
def get_exams(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    subject_id: Optional[int] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Retrieve a paginated and filtered directory of exam templates."""
    data = ExamRepository.get_paginated_exams(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        subject_id=subject_id,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order
    )

    records = [ExamResponse.model_validate(e) for e in data["exams"]]

    paginated = PaginatedResponse(
        total_records=data["total_records"],
        total_pages=data["total_pages"],
        current_page=data["current_page"],
        page_size=data["page_size"],
        records=records
    )

    return ApiResponse(
        success=True,
        message="Exams loaded successfully",
        data=paginated
    )

@router.post("", response_model=ApiResponse[ExamResponse], status_code=status.HTTP_201_CREATED)
def create_exam(
    payload: ExamCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Register and configure a new exam template and map its questions. (Admin Only)"""
    code = payload.code.strip().upper()
    
    # Check duplicate code
    existing = db.query(Exam).filter(Exam.code == code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exam code '{code}' is already registered."
        )

    # Create exam template
    db_exam = Exam(
        name=payload.name.strip(),
        code=code,
        description=payload.description.strip() if payload.description else None,
        subject_id=payload.subject_id,
        instructions=payload.instructions.strip() if payload.instructions else None,
        duration_minutes=payload.duration_minutes,
        passing_marks=payload.passing_marks,
        total_marks=payload.total_marks,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="draft",  # Default template state
        randomize_questions=payload.randomize_questions,
        randomize_options=payload.randomize_options,
        show_result_immediately=payload.show_result_immediately,
        allow_multiple_attempts=payload.allow_multiple_attempts,
        max_attempts=payload.max_attempts,
        auto_submit=payload.auto_submit,
        timezone=payload.timezone or "UTC",
        late_entry_allowed=payload.late_entry_allowed,
        grace_time_minutes=payload.grace_time_minutes,
        calculator_allowed=payload.calculator_allowed,
        negative_marking=payload.negative_marking,
        voice_navigation_availability=payload.voice_navigation_availability
    )
    db.add(db_exam)
    db.flush()  # Populate ID

    # Map question links
    if payload.questions:
        for idx, q_map in enumerate(payload.questions):
            db_eq = ExamQuestion(
                exam_id=db_exam.id,
                question_id=q_map.question_id,
                display_order=q_map.display_order or (idx + 1),
                marks_override=q_map.marks_override
            )
            db.add(db_eq)

    db.commit()
    db.refresh(db_exam)

    log_security_event(db, user_id=current_user.id, action=f"Exam Created: {code}", request=request)

    loaded = ExamRepository.get_exam_by_id(db, db_exam.id)
    return ApiResponse(
        success=True,
        message="Exam template created successfully",
        data=ExamResponse.model_validate(loaded)
    )

@router.get("/{exam_id}", response_model=ApiResponse[ExamResponse])
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Retrieve detailed exam configurations."""
    exam = ExamRepository.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    return ApiResponse(
        success=True,
        message="Exam loaded successfully",
        data=ExamResponse.model_validate(exam)
    )

@router.put("/{exam_id}", response_model=ApiResponse[ExamResponse])
def update_exam(
    exam_id: int,
    payload: ExamCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Modify exam configurations and update mapped questions list. (Admin Only)"""
    exam = ExamRepository.get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    code = payload.code.strip().upper()
    if code != exam.code:
        dup = db.query(Exam).filter(Exam.code == code).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Exam code '{code}' is already assigned to another exam."
            )
        exam.code = code

    # Apply configuration modifications
    exam.name = payload.name.strip()
    exam.description = payload.description.strip() if payload.description else None
    exam.subject_id = payload.subject_id
    exam.instructions = payload.instructions.strip() if payload.instructions else None
    exam.duration_minutes = payload.duration_minutes
    exam.passing_marks = payload.passing_marks
    exam.total_marks = payload.total_marks
    exam.start_date = payload.start_date
    exam.end_date = payload.end_date
    
    exam.randomize_questions = payload.randomize_questions
    exam.randomize_options = payload.randomize_options
    exam.show_result_immediately = payload.show_result_immediately
    exam.allow_multiple_attempts = payload.allow_multiple_attempts
    exam.max_attempts = payload.max_attempts
    exam.auto_submit = payload.auto_submit
    exam.timezone = payload.timezone or "UTC"
    exam.late_entry_allowed = payload.late_entry_allowed
    exam.grace_time_minutes = payload.grace_time_minutes
    exam.calculator_allowed = payload.calculator_allowed
    exam.negative_marking = payload.negative_marking
    exam.voice_navigation_availability = payload.voice_navigation_availability

    # Clear old mapped question links
    db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).delete()

    # Re-write question mapping
    if payload.questions:
        for idx, q_map in enumerate(payload.questions):
            db_eq = ExamQuestion(
                exam_id=exam_id,
                question_id=q_map.question_id,
                display_order=q_map.display_order or (idx + 1),
                marks_override=q_map.marks_override
            )
            db.add(db_eq)

    db.commit()
    db.refresh(exam)

    log_security_event(db, user_id=current_user.id, action=f"Exam Updated: {code}", request=request)

    loaded = ExamRepository.get_exam_by_id(db, exam_id)
    return ApiResponse(
        success=True,
        message="Exam updated successfully",
        data=ExamResponse.model_validate(loaded)
    )

@router.delete("/{exam_id}", response_model=ApiResponse[dict])
def delete_exam(
    exam_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Delete exam configurations template. (Admin Only)"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    code = exam.code
    db.delete(exam)
    db.commit()

    log_security_event(db, user_id=current_user.id, action=f"Exam Deleted: {code}", request=request)

    return ApiResponse(
        success=True,
        message="Exam deleted successfully",
        data={}
    )

@router.post("/{exam_id}/clone", response_model=ApiResponse[ExamResponse])
def clone_exam(
    exam_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Clone an exam config, resetting status to 'draft' and assigning a unique code. (Admin Only)"""
    original = ExamRepository.get_exam_by_id(db, exam_id)
    if not original:
        raise HTTPException(status_code=404, detail="Original exam not found")

    # Generate a unique cloned code
    unique_suffix = uuid.uuid4().hex[:6].upper()
    cloned_code = f"CLONE-{original.code}-{unique_suffix}"

    cloned_exam = Exam(
        name=f"Copy of {original.name}",
        code=cloned_code,
        description=original.description,
        subject_id=original.subject_id,
        instructions=original.instructions,
        duration_minutes=original.duration_minutes,
        passing_marks=original.passing_marks,
        total_marks=original.total_marks,
        start_date=original.start_date,
        end_date=original.end_date,
        status="draft",  # Always default clone to draft
        randomize_questions=original.randomize_questions,
        randomize_options=original.randomize_options,
        show_result_immediately=original.show_result_immediately,
        allow_multiple_attempts=original.allow_multiple_attempts,
        max_attempts=original.max_attempts,
        auto_submit=original.auto_submit,
        timezone=original.timezone,
        late_entry_allowed=original.late_entry_allowed,
        grace_time_minutes=original.grace_time_minutes,
        calculator_allowed=original.calculator_allowed,
        negative_marking=original.negative_marking,
        voice_navigation_availability=original.voice_navigation_availability
    )
    db.add(cloned_exam)
    db.flush()

    # Map question links from original
    for q_map in original.questions:
        db_eq = ExamQuestion(
            exam_id=cloned_exam.id,
            question_id=q_map.question_id,
            display_order=q_map.display_order,
            marks_override=q_map.marks_override
        )
        db.add(db_eq)

    db.commit()
    db.refresh(cloned_exam)

    log_security_event(db, user_id=current_user.id, action=f"Exam Cloned: {original.code} to {cloned_code}", request=request)

    loaded = ExamRepository.get_exam_by_id(db, cloned_exam.id)
    return ApiResponse(
        success=True,
        message="Exam cloned successfully",
        data=ExamResponse.model_validate(loaded)
    )

@router.post("/{exam_id}/publish", response_model=ApiResponse[ExamResponse])
def publish_exam(
    exam_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Publish exam template configuration. (Admin Only)"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    exam.status = "published"
    db.commit()
    db.refresh(exam)

    log_security_event(db, user_id=current_user.id, action=f"Exam Published: {exam.code}", request=request)

    loaded = ExamRepository.get_exam_by_id(db, exam_id)
    return ApiResponse(
        success=True,
        message="Exam published successfully",
        data=ExamResponse.model_validate(loaded)
    )

@router.post("/{exam_id}/archive", response_model=ApiResponse[ExamResponse])
def archive_exam(
    exam_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Archive exam configuration. (Admin Only)"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    exam.status = "archived"
    db.commit()
    db.refresh(exam)

    log_security_event(db, user_id=current_user.id, action=f"Exam Archived: {exam.code}", request=request)

    loaded = ExamRepository.get_exam_by_id(db, exam_id)
    return ApiResponse(
        success=True,
        message="Exam archived successfully",
        data=ExamResponse.model_validate(loaded)
    )

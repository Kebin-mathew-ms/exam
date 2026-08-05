from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.auth.dependencies import RoleChecker
from app.models.exam import Subject, Question, Exam
from app.schemas.exam_schemas import SubjectCreate, SubjectResponse
from app.schemas.schemas import ApiResponse
from app.services.audit import log_security_event

router = APIRouter(prefix="/admin/subjects", tags=["Subject Management"])

admin_access = RoleChecker(["admin", "super_admin"])

@router.get("", response_model=ApiResponse[List[SubjectResponse]])
def get_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Retrieve all subject templates registered in the portal."""
    subjects = db.query(Subject).all()
    return ApiResponse(
        success=True,
        message="Subjects retrieved successfully",
        data=[SubjectResponse.model_validate(s) for s in subjects]
    )

@router.post("", response_model=ApiResponse[SubjectResponse], status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Register a new subject code and syllabus description. (Admin Only)"""
    code = payload.subject_code.strip().upper()
    
    # Check duplicate subject code
    existing = db.query(Subject).filter(Subject.subject_code == code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subject code '{code}' is already registered."
        )

    db_sub = Subject(
        subject_name=payload.subject_name.strip(),
        subject_code=code,
        description=payload.description.strip() if payload.description else None,
        status=payload.status or "active"
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)

    log_security_event(db, user_id=current_user.id, action=f"Subject Created: {code}", request=request)

    return ApiResponse(
        success=True,
        message="Subject registered successfully",
        data=SubjectResponse.model_validate(db_sub)
    )

@router.put("/{subject_id}", response_model=ApiResponse[SubjectResponse])
def update_subject(
    subject_id: int,
    payload: SubjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Update details of a registered subject template. (Admin Only)"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    code = payload.subject_code.strip().upper()
    if code != subject.subject_code:
        # Check duplicate code
        dup = db.query(Subject).filter(Subject.subject_code == code).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subject code '{code}' is already assigned to another subject."
            )
        subject.subject_code = code

    subject.subject_name = payload.subject_name.strip()
    subject.description = payload.description.strip() if payload.description else None
    if payload.status:
        subject.status = payload.status

    db.commit()
    db.refresh(subject)

    log_security_event(db, user_id=current_user.id, action=f"Subject Updated: {code}", request=request)

    return ApiResponse(
        success=True,
        message="Subject details updated successfully",
        data=SubjectResponse.model_validate(subject)
    )

@router.delete("/{subject_id}", response_model=ApiResponse[dict])
def delete_subject(
    subject_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Delete a subject template. Aborts if linked to questions or exams. (Admin Only)"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Prevent deletion if subject is linked to questions
    linked_q = db.query(Question).filter(Question.subject_id == subject_id).first()
    if linked_q:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete subject: It has questions mapped inside the Question Bank."
        )

    # Prevent deletion if subject is linked to exams
    linked_ex = db.query(Exam).filter(Exam.subject_id == subject_id).first()
    if linked_ex:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete subject: It is linked to exam configurations."
        )

    code = subject.subject_code
    db.delete(subject)
    db.commit()

    log_security_event(db, user_id=current_user.id, action=f"Subject Deleted: {code}", request=request)

    return ApiResponse(
        success=True,
        message="Subject deleted successfully",
        data={}
    )

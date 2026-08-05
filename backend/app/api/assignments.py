from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database.session import get_db
from app.auth.dependencies import RoleChecker
from app.models.exam import Exam, StudentExamAssignment
from app.models.domain import User
from app.schemas.exam_schemas import StudentAssignmentCreate, StudentAssignmentResponse
from app.schemas.schemas import ApiResponse
from app.services.audit import log_security_event

router = APIRouter(prefix="/admin/assignments", tags=["Exam Student Assignment"])

admin_access = RoleChecker(["admin", "super_admin"])

@router.get("", response_model=ApiResponse[List[StudentAssignmentResponse]])
def get_assignments(
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Retrieve all student exam assignments, pre-loading user names and exam names."""
    assignments = db.query(StudentExamAssignment).options(
        joinedload(StudentExamAssignment.exam),
        joinedload(StudentExamAssignment.student)
    ).all()

    result = []
    for a in assignments:
        res = StudentAssignmentResponse.model_validate(a)
        if a.student:
            res.student_name = f"{a.student.first_name} {a.student.last_name}"
            res.student_email = a.student.email
        result.append(res)

    return ApiResponse(
        success=True,
        message="Assignments list loaded successfully",
        data=result
    )

@router.post("", response_model=ApiResponse[dict], status_code=status.HTTP_201_CREATED)
def assign_exam_to_students(
    payload: StudentAssignmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Assign an exam template to individual or multiple student IDs in bulk. (Admin Only)"""
    exam = db.query(Exam).filter(Exam.id == payload.exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam template not found"
        )

    assigned_count = 0
    skipped_count = 0

    for s_id in payload.student_ids:
        # Verify student exists and has student role (role_id = 2)
        student = db.query(User).filter(User.id == s_id, User.role_id == 2).first()
        if not student:
            skipped_count += 1
            continue

        # Check if already assigned
        existing = db.query(StudentExamAssignment).filter(
            StudentExamAssignment.student_id == s_id,
            StudentExamAssignment.exam_id == payload.exam_id
        ).first()

        if existing:
            skipped_count += 1
            continue

        # Create assignment
        db_assign = StudentExamAssignment(
            student_id=s_id,
            exam_id=payload.exam_id,
            assigned_by_id=current_user.id,
            status="assigned"
        )
        db.add(db_assign)
        assigned_count += 1

    db.commit()

    log_security_event(
        db, 
        user_id=current_user.id, 
        action=f"Exam Assigned: {exam.code} to {assigned_count} students (skipped {skipped_count})", 
        request=request
    )

    return ApiResponse(
        success=True,
        message=f"Exam assignments processed. Mapped {assigned_count} students successfully, skipped {skipped_count}.",
        data={"assigned": assigned_count, "skipped": skipped_count}
    )

@router.delete("/{assignment_id}", response_model=ApiResponse[dict])
def revoke_assignment(
    assignment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Revoke and delete a student exam assignment. (Admin Only)"""
    assign = db.query(StudentExamAssignment).filter(StudentExamAssignment.id == assignment_id).first()
    if not assign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )

    db.delete(assign)
    db.commit()

    log_security_event(db, user_id=current_user.id, action=f"Assignment Revoked: ID {assignment_id}", request=request)

    return ApiResponse(
        success=True,
        message="Exam assignment revoked successfully",
        data={}
    )

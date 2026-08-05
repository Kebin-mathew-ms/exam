from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from app.database.session import get_db
from app.auth.dependencies import get_current_active_user, RoleChecker
from app.models.attempt import ExamAttempt, StudentAnswer
from app.models.exam import Exam, Subject
from app.models.result import Result, Evaluation
from app.models.domain import User, StudentProfile
from app.services.evaluation_service import EvaluationService
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/results", tags=["Exam Results & Analytics"])

admin_access = RoleChecker(["admin", "super_admin"])
any_auth = get_current_active_user

class PublishResultsRequest(BaseModel):
    exam_id: int
    is_published: bool

class RecalculateRequest(BaseModel):
    exam_id: int

@router.get("")
def get_results_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(any_auth)
):
    """Retrieve list of examination results (Students only see published cards)."""
    query = db.query(Result).options(
        joinedload(Result.exam).joinedload(Exam.subject),
        joinedload(Result.student)
    )

    if current_user.role_id == 2:  # Student
        query = query.filter(
            Result.student_id == current_user.id,
            Result.is_published == True
        )

    results = query.all()
    data = []
    for r in results:
        data.append({
            "id": r.id,
            "attempt_id": r.attempt_id,
            "student_name": f"{r.student.first_name} {r.student.last_name}",
            "exam_name": r.exam.name,
            "exam_code": r.exam.code,
            "subject_name": r.exam.subject.subject_name,
            "final_score": float(r.final_score),
            "percentage": float(r.percentage),
            "grade": r.grade,
            "rank": r.exam_rank,
            "status": r.status,
            "is_published": r.is_published
        })

    return ApiResponse(
        success=True,
        message="Results loaded successfully",
        data=data
    )

@router.post("/publish")
def publish_exam_results(
    payload: PublishResultsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Bulk publish or unpublish student scores reports for an exam template."""
    results = db.query(Result).filter(Result.exam_id == payload.exam_id).all()
    for r in results:
        r.is_published = payload.is_published
        if payload.is_published:
            r.published_at = func.now()

    db.commit()

    return ApiResponse(
        success=True,
        message=f"Exam results {'published' if payload.is_published else 'unpublished'} successfully",
        data={}
    )

@router.post("/recalculate")
def force_recalculate_ranks(
    payload: RecalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Force grade configurations refresh and tie-breaker ranks recalculations."""
    EvaluationService.calculate_ranks_and_grades(db, payload.exam_id)
    return ApiResponse(
        success=True,
        message="Ranks and grade configurations recalculated successfully",
        data={}
    )

@router.get("/analytics")
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(any_auth)
):
    """Retrieve statistical aggregations for charts (Pass/Fail rates, accessibility use)."""
    # 1. Total Student Counts
    total_students = db.query(User).filter(User.role_id == 2).count()
    
    # 2. Avg marks, passing percent
    avg_score = db.query(func.avg(Result.final_score)).scalar() or 0.00
    passed_count = db.query(Result).filter(Result.status == "pass").count()
    failed_count = db.query(Result).filter(Result.status == "fail").count()

    # 3. Accessibility preferences stats
    auto_narrate_count = db.query(User).join(User.student_profile).filter(
        StudentProfile.accessibility_requirement_id.in_([1, 2, 3])  # Blind, Visually Impaired, Dyslexic
    ).count()

    # Mock historical score distribution line data
    distribution_data = [
        {"range": "A+", "count": db.query(Result).filter(Result.grade == "A+").count()},
        {"range": "A", "count": db.query(Result).filter(Result.grade == "A").count()},
        {"range": "B+", "count": db.query(Result).filter(Result.grade == "B+").count()},
        {"range": "B", "count": db.query(Result).filter(Result.grade == "B").count()},
        {"range": "C", "count": db.query(Result).filter(Result.grade == "C").count()},
        {"range": "D", "count": db.query(Result).filter(Result.grade == "D").count()},
        {"range": "F", "count": db.query(Result).filter(Result.grade == "F").count()},
    ]

    return ApiResponse(
        success=True,
        message="Analytics aggregations loaded",
        data={
            "total_students": total_students,
            "avg_score": float(round(avg_score, 2)),
            "pass_rate_percentage": float(round((passed_count / (passed_count + failed_count) * 100), 2)) if (passed_count + failed_count) > 0 else 0.0,
            "passed_count": passed_count,
            "failed_count": failed_count,
            "accessibility_users_count": auto_narrate_count,
            "grade_distribution": distribution_data
        }
    )

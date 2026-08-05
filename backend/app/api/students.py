from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
import re

from app.database.session import get_db
from app.auth.dependencies import RoleChecker
from app.auth.security import hash_password
from app.models.domain import User, StudentProfile, Role, UserStatus, AccessibilityRequirement
from app.repositories.student_repository import StudentRepository
from app.schemas.schemas import ApiResponse, UserResponse, PaginatedResponse
from app.services.upload_service import UploadService
from app.services.audit import log_security_event

router = APIRouter(prefix="/admin/students", tags=["Student Profile Management"])

admin_access = RoleChecker(["admin", "super_admin"])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PHONE_REGEX = re.compile(r"^\+?[\d\s\-()]{7,20}$")

class StudentCreateRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=20)
    password: str = Field(..., min_length=8, max_length=128)
    status_id: int = 1
    enrollment_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: Optional[str] = "en"
    accessibility_requirement_id: Optional[int] = 6  # Default: none

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not EMAIL_REGEX.match(value):
            raise ValueError("Invalid email format")
        return value.lower().strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not PHONE_REGEX.match(value):
            raise ValueError("Invalid phone format")
        return value.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValueError("Password must contain at least one special character")
        return value

class StudentUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    status_id: Optional[int] = None
    enrollment_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    preferred_language: Optional[str] = None
    accessibility_requirement_id: Optional[int] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            if not EMAIL_REGEX.match(value):
                raise ValueError("Invalid email format")
            return value.lower().strip()
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            if not PHONE_REGEX.match(value):
                raise ValueError("Invalid phone format")
            return value.strip()
        return value

@router.get("", response_model=ApiResponse[PaginatedResponse[UserResponse]])
def get_students(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    status_id: Optional[int] = None,
    accessibility_requirement_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Retrieve a filtered, searched, paginated directory of student records."""
    data = StudentRepository.get_paginated_students(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        status_id=status_id,
        accessibility_requirement_id=accessibility_requirement_id,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_order=sort_order
    )

    records = [UserResponse.model_validate(u) for u in data["students"]]

    paginated = PaginatedResponse(
        total_records=data["total_records"],
        total_pages=data["total_pages"],
        current_page=data["current_page"],
        page_size=data["page_size"],
        records=records
    )

    return ApiResponse(
        success=True,
        message="Students paginated list loaded successfully",
        data=paginated
    )

@router.post("", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Add a new student user and initialize their profile. (Admin Only)"""
    # Check duplicate email/phone
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")
    if db.query(User).filter(User.phone == payload.phone).first():
        raise HTTPException(status_code=400, detail="Phone number is already registered")

    # Check duplicate enrollment number if provided
    if payload.enrollment_number:
        dup = db.query(StudentProfile).filter(StudentProfile.enrollment_number == payload.enrollment_number).first()
        if dup:
            raise HTTPException(status_code=400, detail="Enrollment number is already in use")

    # Validate accessibility requirement exists
    if payload.accessibility_requirement_id:
        req = db.query(AccessibilityRequirement).filter(AccessibilityRequirement.id == payload.accessibility_requirement_id).first()
        if not req:
            raise HTTPException(status_code=400, detail="Invalid accessibility_requirement_id")

    # Create user record (role_id 2 = student)
    hashed_pw = hash_password(payload.password)
    db_user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        password=hashed_pw,
        role_id=2,  # Student Role
        status_id=payload.status_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Generate default enrollment number if not provided
    enrollment = payload.enrollment_number or f"STU{db_user.id:04d}"

    # Create detailed profile
    db_profile = StudentProfile(
        user_id=db_user.id,
        enrollment_number=enrollment,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        address=payload.address,
        guardian_name=payload.guardian_name,
        guardian_phone=payload.guardian_phone,
        emergency_contact=payload.emergency_contact,
        preferred_language=payload.preferred_language,
        accessibility_requirement_id=payload.accessibility_requirement_id
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_user)

    log_security_event(db, user_id=db_user.id, action="Student Created", request=request)

    return ApiResponse(
        success=True,
        message="Student profile created successfully",
        data=UserResponse.model_validate(db_user)
    )

@router.get("/{student_id}", response_model=ApiResponse[UserResponse])
def get_student_by_id(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Retrieve detailed student profile."""
    student = StudentRepository.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return ApiResponse(
        success=True,
        message="Student loaded successfully",
        data=UserResponse.model_validate(student)
    )

@router.put("/{student_id}", response_model=ApiResponse[UserResponse])
def update_student(
    student_id: int,
    payload: StudentUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Update student record details. (Admin Only)"""
    student = StudentRepository.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Validate duplicates
    if payload.email and payload.email != student.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Email is already in use")
        student.email = payload.email

    if payload.phone and payload.phone != student.phone:
        if db.query(User).filter(User.phone == payload.phone).first():
            raise HTTPException(status_code=400, detail="Phone number is already in use")
        student.phone = payload.phone

    if payload.enrollment_number and payload.enrollment_number != student.student_profile.enrollment_number:
        dup = db.query(StudentProfile).filter(StudentProfile.enrollment_number == payload.enrollment_number).first()
        if dup:
            raise HTTPException(status_code=400, detail="Enrollment number is already in use")
        student.student_profile.enrollment_number = payload.enrollment_number

    # Apply text updates
    if payload.first_name:
        student.first_name = payload.first_name
    if payload.last_name:
        student.last_name = payload.last_name
    if payload.password:
        student.password = hash_password(payload.password)
        log_security_event(db, user_id=student.id, action="Password Reset", request=request)
    if payload.status_id:
        student.status_id = payload.status_id

    # Apply profile updates
    profile = student.student_profile
    if payload.date_of_birth is not None:
        profile.date_of_birth = payload.date_of_birth
    if payload.gender is not None:
        profile.gender = payload.gender
    if payload.address is not None:
        profile.address = payload.address
    if payload.guardian_name is not None:
        profile.guardian_name = payload.guardian_name
    if payload.guardian_phone is not None:
        profile.guardian_phone = payload.guardian_phone
    if payload.emergency_contact is not None:
        profile.emergency_contact = payload.emergency_contact
    if payload.preferred_language is not None:
        profile.preferred_language = payload.preferred_language
    if payload.accessibility_requirement_id is not None:
        # Validate lookup
        req = db.query(AccessibilityRequirement).filter(AccessibilityRequirement.id == payload.accessibility_requirement_id).first()
        if not req:
            raise HTTPException(status_code=400, detail="Invalid accessibility_requirement_id")
        profile.accessibility_requirement_id = payload.accessibility_requirement_id

    db.commit()
    db.refresh(student)

    log_security_event(db, user_id=student.id, action="Student Updated", request=request)

    return ApiResponse(
        success=True,
        message="Student profile updated successfully",
        data=UserResponse.model_validate(student)
    )

@router.delete("/{student_id}", response_model=ApiResponse[dict])
def delete_student(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Delete student user account and cascades student profile. (Admin Only)"""
    student = StudentRepository.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Remove photo file if exists
    if student.profile_photo:
        UploadService.delete_profile_image(student.profile_photo)

    db.delete(student)
    db.commit()

    log_security_event(db, user_id=student_id, action="Student Deleted", request=request)

    return ApiResponse(
        success=True,
        message="Student deleted successfully",
        data={}
    )

@router.post("/{student_id}/photo", response_model=ApiResponse[UserResponse])
def upload_student_photo(
    student_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_access)
):
    """Upload and set student profile image. (Admin Only)"""
    student = StudentRepository.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Save photo and delete old
    relative_path = UploadService.save_profile_image(file, student.profile_photo)
    
    student.profile_photo = relative_path
    db.commit()
    db.refresh(student)

    log_security_event(db, user_id=student.id, action="Image Uploaded", request=request)

    return ApiResponse(
        success=True,
        message="Student photo uploaded successfully",
        data=UserResponse.model_validate(student)
    )

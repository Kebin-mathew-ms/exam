from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_active_user, RoleChecker
from app.auth.security import hash_password
from app.models.domain import User, StudentProfile, Role, UserStatus
from app.schemas.schemas import ApiResponse, UserCreate, UserUpdate, UserResponse
from app.services.audit import log_security_event

router = APIRouter(prefix="/users", tags=["Users"])

# Define access guards
admin_only = RoleChecker(["admin"])
admin_or_self = RoleChecker(["admin", "student"])

@router.get("", response_model=ApiResponse[List[UserResponse]])
def get_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(admin_only)
):
    """Retrieve all users. (Admin Only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    user_responses = [UserResponse.model_validate(u) for u in users]
    return ApiResponse(
        success=True,
        message="Users retrieved successfully",
        data=user_responses
    )

@router.post("", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(admin_only)
):
    """Create a new user. (Admin Only)"""
    # 1. Validate role_id and status_id exist
    role = db.query(Role).filter(Role.id == user_data.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role_id")
        
    status_obj = db.query(UserStatus).filter(UserStatus.id == user_data.status_id).first()
    if not status_obj:
        raise HTTPException(status_code=400, detail="Invalid status_id")

    # 2. Check duplicates (Email & Phone)
    if db.query(User).filter(User.email == user_data.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email is already registered")
    if db.query(User).filter(User.phone == user_data.phone).first():
        raise HTTPException(status_code=400, detail="Phone number is already registered")

    # 3. Create user record
    hashed_pw = hash_password(user_data.password)
    db_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email.lower(),
        phone=user_data.phone,
        password=hashed_pw,
        role_id=user_data.role_id,
        status_id=user_data.status_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # 4. If student, auto-create a student profile
    if role.name == "student":
        student_profile = StudentProfile(
            user_id=db_user.id,
            enrollment_number=f"STU{db_user.id:04d}",
            gender=None,
            date_of_birth=None,
            address=None
        )
        db.add(student_profile)
        db.commit()
        db.refresh(db_user) # reload user with relationship

    return ApiResponse(
        success=True,
        message="User created successfully",
        data=UserResponse.model_validate(db_user)
    )

@router.get("/{user_id}", response_model=ApiResponse[UserResponse])
def get_user_by_id(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(admin_or_self)
):
    """Retrieve user details. Users can retrieve their own details, admins can retrieve anyone's."""
    # Auth authorization check
    if current_user.role.name != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this user profile"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return ApiResponse(
        success=True,
        message="User profile retrieved successfully",
        data=UserResponse.model_validate(user)
    )

@router.put("/{user_id}", response_model=ApiResponse[UserResponse])
def update_user(
    user_id: int, 
    user_data: UserUpdate, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: User = Depends(admin_or_self)
):
    """Update user information. Users can update themselves, Admins can update any user."""
    # Auth authorization check
    if current_user.role.name != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this user profile"
        )

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate duplicates if email/phone changed
    if user_data.email and user_data.email.lower() != db_user.email:
        if db.query(User).filter(User.email == user_data.email.lower()).first():
            raise HTTPException(status_code=400, detail="Email is already in use by another user")
        db_user.email = user_data.email.lower()

    if user_data.phone and user_data.phone != db_user.phone:
        if db.query(User).filter(User.phone == user_data.phone).first():
            raise HTTPException(status_code=400, detail="Phone number is already in use by another user")
        db_user.phone = user_data.phone

    # Apply updates
    if user_data.first_name:
        db_user.first_name = user_data.first_name
    if user_data.last_name:
        db_user.last_name = user_data.last_name
    if user_data.profile_photo is not None:
        db_user.profile_photo = user_data.profile_photo

    # If updating passwords, log the audit event
    if user_data.password:
        db_user.password = hash_password(user_data.password)
        log_security_event(db, user_id=db_user.id, action="password_change", request=request)

    # Role and Status updates (Admin Only)
    if current_user.role.name == "admin":
        if user_data.role_id:
            role = db.query(Role).filter(Role.id == user_data.role_id).first()
            if not role:
                raise HTTPException(status_code=400, detail="Invalid role_id")
            db_user.role_id = user_data.role_id
            
        if user_data.status_id:
            status_obj = db.query(UserStatus).filter(UserStatus.id == user_data.status_id).first()
            if not status_obj:
                raise HTTPException(status_code=400, detail="Invalid status_id")
            db_user.status_id = user_data.status_id

    db.commit()
    db.refresh(db_user)

    return ApiResponse(
        success=True,
        message="User profile updated successfully",
        data=UserResponse.model_validate(db_user)
    )

@router.delete("/{user_id}", response_model=ApiResponse[dict])
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(admin_only)
):
    """Delete a user. (Admin Only)"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(db_user)
    db.commit()

    return ApiResponse(
        success=True,
        message="User deleted successfully",
        data={}
    )

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.auth.dependencies import RoleChecker
from app.auth.security import hash_password
from app.models.domain import User, Role, UserStatus
from app.schemas.schemas import ApiResponse, UserCreate, UserUpdate, UserResponse
from app.services.audit import log_security_event

router = APIRouter(prefix="/admin/admins", tags=["Admin Account Management"])

super_admin_only = RoleChecker(["super_admin"])
admin_access = RoleChecker(["admin", "super_admin"])

class AdminPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)

@router.get("", response_model=ApiResponse[List[UserResponse]])
def get_admins(db: Session = Depends(get_db), current_user: User = Depends(admin_access)):
    """Retrieve all administrator accounts (Admin and Super Admin roles)."""
    admins = db.query(User).join(User.role).filter(
        Role.name.in_(["admin", "super_admin"])
    ).all()
    
    return ApiResponse(
        success=True,
        message="Administrators retrieved successfully",
        data=[UserResponse.model_validate(admin) for admin in admins]
    )

@router.post("", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
def create_admin_account(
    admin_data: UserCreate, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: User = Depends(super_admin_only)
):
    """Create a new Admin or Super Admin account. (Super Admin Only)"""
    # Verify selected role is an Admin role
    role = db.query(Role).filter(Role.id == admin_data.role_id).first()
    if not role or role.name not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Role must be either 'admin' or 'super_admin'"
        )

    # Check duplicates
    if db.query(User).filter(User.email == admin_data.email.lower().strip()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")
    if db.query(User).filter(User.phone == admin_data.phone.strip()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is already registered")

    hashed_pw = hash_password(admin_data.password)
    db_admin = User(
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        email=admin_data.email.lower().strip(),
        phone=admin_data.phone.strip(),
        password=hashed_pw,
        role_id=admin_data.role_id,
        status_id=admin_data.status_id
    )
    
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)

    # Log audit event
    log_security_event(db, user_id=db_admin.id, action=f"Admin Created (Role: {role.name})", request=request)

    return ApiResponse(
        success=True,
        message="Admin account registered successfully",
        data=UserResponse.model_validate(db_admin)
    )

@router.get("/{admin_id}", response_model=ApiResponse[UserResponse])
def get_admin_by_id(admin_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_access)):
    """Get administrator account details."""
    admin = db.query(User).join(User.role).filter(
        User.id == admin_id,
        Role.name.in_(["admin", "super_admin"])
    ).first()

    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found")
        
    return ApiResponse(
        success=True,
        message="Admin details loaded successfully",
        data=UserResponse.model_validate(admin)
    )

@router.put("/{admin_id}", response_model=ApiResponse[UserResponse])
def update_admin_account(
    admin_id: int, 
    admin_data: UserUpdate, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: User = Depends(super_admin_only)
):
    """Update admin profile details. (Super Admin Only)"""
    db_admin = db.query(User).filter(User.id == admin_id).first()
    if not db_admin or db_admin.role.name not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found")

    # Validate duplicates
    if admin_data.email and admin_data.email.lower() != db_admin.email:
        if db.query(User).filter(User.email == admin_data.email.lower()).first():
            raise HTTPException(status_code=400, detail="Email is already in use")
        db_admin.email = admin_data.email.lower()

    if admin_data.phone and admin_data.phone != db_admin.phone:
        if db.query(User).filter(User.phone == admin_data.phone).first():
            raise HTTPException(status_code=400, detail="Phone number is already in use")
        db_admin.phone = admin_data.phone

    # Apply text updates
    if admin_data.first_name:
        db_admin.first_name = admin_data.first_name
    if admin_data.last_name:
        db_admin.last_name = admin_data.last_name
    if admin_data.profile_photo is not None:
        db_admin.profile_photo = admin_data.profile_photo

    # Assign password if provided
    if admin_data.password:
        db_admin.password = hash_password(admin_data.password)
        log_security_event(db, user_id=db_admin.id, action="Password Reset", request=request)

    # Role assignment and status adjustments (Super Admin Only)
    if admin_data.role_id:
        role = db.query(Role).filter(Role.id == admin_data.role_id).first()
        if not role or role.name not in ["admin", "super_admin"]:
            raise HTTPException(status_code=400, detail="Invalid role_id. Must be admin or super_admin")
        db_admin.role_id = admin_data.role_id

    if admin_data.status_id:
        status_obj = db.query(UserStatus).filter(UserStatus.id == admin_data.status_id).first()
        if not status_obj:
            raise HTTPException(status_code=400, detail="Invalid status_id")
        db_admin.status_id = admin_data.status_id

    db.commit()
    db.refresh(db_admin)

    # Log audit event
    log_security_event(db, user_id=db_admin.id, action="Admin Updated", request=request)

    return ApiResponse(
        success=True,
        message="Admin account updated successfully",
        data=UserResponse.model_validate(db_admin)
    )

@router.delete("/{admin_id}", response_model=ApiResponse[dict])
def delete_admin_account(
    admin_id: int, 
    request: Request,
    db: Session = Depends(get_db), 
    current_user: User = Depends(super_admin_only)
):
    """Delete an admin account. Super Admins cannot delete themselves. (Super Admin Only)"""
    if current_user.id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Self-deletion of Super Admin accounts is forbidden"
        )

    db_admin = db.query(User).filter(User.id == admin_id).first()
    if not db_admin or db_admin.role.name not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found")

    # Perform deletion
    db.delete(db_admin)
    db.commit()

    # Log audit event
    log_security_event(db, user_id=admin_id, action="Admin Deleted", request=request)

    return ApiResponse(
        success=True,
        message="Admin account deleted successfully",
        data={}
    )

@router.post("/{admin_id}/reset-password", response_model=ApiResponse[dict])
def reset_admin_password(
    admin_id: int,
    payload: AdminPasswordReset,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(super_admin_only)
):
    """Force reset an admin account password. (Super Admin Only)"""
    db_admin = db.query(User).filter(User.id == admin_id).first()
    if not db_admin or db_admin.role.name not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrator not found")

    db_admin.password = hash_password(payload.new_password)
    db.commit()

    log_security_event(db, user_id=db_admin.id, action="Password Reset", request=request)

    return ApiResponse(
        success=True,
        message="Password reset successful",
        data={}
    )

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_active_user
from app.auth.security import hash_password, verify_password
from app.models.domain import User
from app.schemas.schemas import ApiResponse, UserResponse, UserUpdate, PasswordChangeRequest
from app.services.upload_service import UploadService
from app.services.audit import log_security_event

router = APIRouter(prefix="/profile", tags=["Profile Self Management"])

@router.get("", response_model=ApiResponse[UserResponse])
def get_own_profile(current_user: User = Depends(get_current_active_user)):
    """Retrieve the logged-in user's profile details."""
    return ApiResponse(
        success=True,
        message="Profile details loaded successfully",
        data=UserResponse.model_validate(current_user)
    )

@router.put("", response_model=ApiResponse[UserResponse])
def update_own_profile(
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update personal profile information."""
    # Check duplicate email
    if payload.email and payload.email.lower() != current_user.email:
        if db.query(User).filter(User.email == payload.email.lower()).first():
            raise HTTPException(status_code=400, detail="Email is already registered by another user")
        current_user.email = payload.email.lower()

    # Check duplicate phone
    if payload.phone and payload.phone != current_user.phone:
        if db.query(User).filter(User.phone == payload.phone).first():
            raise HTTPException(status_code=400, detail="Phone number is already registered by another user")
        current_user.phone = payload.phone

    # Apply updates
    if payload.first_name:
        current_user.first_name = payload.first_name
    if payload.last_name:
        current_user.last_name = payload.last_name

    db.commit()
    db.refresh(current_user)

    log_security_event(db, user_id=current_user.id, action="Profile Updated", request=request)

    return ApiResponse(
        success=True,
        message="Profile updated successfully",
        data=UserResponse.model_validate(current_user)
    )

@router.post("/change-password", response_model=ApiResponse[dict])
def change_own_password(
    payload: PasswordChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Change the logged-in user's account password."""
    # Verify current password is correct
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Hash and save new password
    current_user.password = hash_password(payload.new_password)
    db.commit()

    log_security_event(db, user_id=current_user.id, action="Password Changed", request=request)

    return ApiResponse(
        success=True,
        message="Password changed successfully",
        data={}
    )

@router.post("/photo", response_model=ApiResponse[UserResponse])
def upload_own_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload and change the logged-in user's profile image."""
    relative_path = UploadService.save_profile_image(file, current_user.profile_photo)
    
    current_user.profile_photo = relative_path
    db.commit()
    db.refresh(current_user)

    log_security_event(db, user_id=current_user.id, action="Image Uploaded", request=request)

    return ApiResponse(
        success=True,
        message="Profile photo uploaded successfully",
        data=UserResponse.model_validate(current_user)
    )

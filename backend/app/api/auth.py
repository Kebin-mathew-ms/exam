from datetime import datetime, UTC, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.session import get_db
from app.auth.security import verify_password, create_access_token, create_refresh_token, verify_token
from app.auth.dependencies import get_current_active_user
from app.models.domain import User, UserToken
from app.schemas.schemas import ApiResponse, UserLogin, TokenData, UserResponse
from app.services.audit import log_security_event
from app.config.settings import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/login", response_model=ApiResponse[TokenData])
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and return JWT access and refresh tokens."""
    # Find user
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.password):
        # Prevent details leakage on invalid credentials
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Check status
    if user.status.name != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {user.status.name}"
        )

    # Create tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    # Save refresh token in DB
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = UserToken(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()

    # Log audit event
    log_security_event(db, user_id=user.id, action="login", request=request)

    # Prepare response data
    user_response = UserResponse.model_validate(user)
    token_data = TokenData(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )

    return ApiResponse(
        success=True,
        message="Login successful",
        data=token_data
    )

@router.post("/logout", response_model=ApiResponse[dict])
def logout(token_data: RefreshTokenRequest, request: Request, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Invalidate the user's refresh token and log out."""
    # Delete refresh token from DB
    db_token = db.query(UserToken).filter(UserToken.refresh_token == token_data.refresh_token).first()
    if db_token:
        db.delete(db_token)
        db.commit()

    # Log audit event
    log_security_event(db, user_id=current_user.id, action="logout", request=request)

    return ApiResponse(
        success=True,
        message="Logout successful",
        data={}
    )

@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(current_user: User = Depends(get_current_active_user)):
    """Retrieve details of the currently authenticated user."""
    return ApiResponse(
        success=True,
        message="User details retrieved successfully",
        data=UserResponse.model_validate(current_user)
    )

@router.post("/refresh", response_model=ApiResponse[TokenData])
def refresh(token_data: RefreshTokenRequest, request: Request, db: Session = Depends(get_db)):
    """Generate new access and refresh tokens using a valid refresh token."""
    # Verify JWT validity
    user_id = verify_token(token_data.refresh_token, token_type="refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Check database record to prevent reuse of revoked tokens
    db_token = db.query(UserToken).filter(
        UserToken.refresh_token == token_data.refresh_token,
        UserToken.expires_at > datetime.now()
    ).first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or expired in registry"
        )

    # Check user
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or user.status.name != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or blocked"
        )

    # Rotate refresh tokens (delete old one)
    db.delete(db_token)

    # Create new tokens
    access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    # Save new refresh token
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_db_token = UserToken(
        user_id=user.id,
        refresh_token=new_refresh_token,
        expires_at=expires_at
    )
    db.add(new_db_token)
    db.commit()

    # Log audit event
    log_security_event(db, user_id=user.id, action="token_refresh", request=request)

    # Prepare response data
    user_response = UserResponse.model_validate(user)
    token_response = TokenData(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=user_response
    )

    return ApiResponse(
        success=True,
        message="Token refreshed successfully",
        data=token_response
    )

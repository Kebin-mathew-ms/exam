from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.auth.dependencies import get_current_active_user
from app.models.result import Notification
from app.models.domain import User
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/notifications", tags=["System Notifications"])

@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve in-app notifications for the active user."""
    notes = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

    data = []
    for n in notes:
        data.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at
        })

    return ApiResponse(
        success=True,
        message="Notifications loaded successfully",
        data=data
    )

@router.put("/read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark all active notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()

    return ApiResponse(
        success=True,
        message="All notifications marked as read",
        data={}
    )

@router.delete("/{note_id}")
def delete_notification(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a notification by ID."""
    note = db.query(Notification).filter(
        Notification.id == note_id,
        Notification.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(note)
    db.commit()

    return ApiResponse(
        success=True,
        message="Notification deleted successfully",
        data={}
    )

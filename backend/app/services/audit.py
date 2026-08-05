from fastapi import Request
from sqlalchemy.orm import Session
from app.models.domain import AuditLog

def log_security_event(db: Session, user_id: int, action: str, request: Request = None):
    """Log an authentication or security event to the audit_logs table."""
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log

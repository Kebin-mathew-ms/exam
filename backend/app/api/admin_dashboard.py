import os
import sys
import platform
import time
from datetime import datetime, UTC, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.auth.dependencies import RoleChecker
from app.models.domain import User, Role, UserToken, AuditLog, StudentProfile
from app.schemas.schemas import ApiResponse, DashboardStatistics, SystemInfoResponse, UserResponse, AuditLogResponse

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

# Access restricted to normal admins and super admins
admin_access = RoleChecker(["admin", "super_admin"])

# Boot time of this module to calculate approximate process uptime
START_TIME = time.time()

@router.get("/statistics", response_model=ApiResponse[DashboardStatistics])
def get_dashboard_statistics(db: Session = Depends(get_db), current_user: User = Depends(admin_access)):
    """Calculate aggregate statistics for the admin dashboard dashboard cards."""
    # 1. Total Students
    total_students = db.query(User).join(User.role).filter(Role.name == "student").count()
    
    # 2. Active Students (status_id = 1)
    active_students = db.query(User).join(User.role).filter(Role.name == "student", User.status_id == 1).count()
    
    # 3. Inactive Students (status_id in [2, 3])
    inactive_students = db.query(User).join(User.role).filter(Role.name == "student", User.status_id.in_([2, 3])).count()
    
    # 4. Total Admins (roles 'admin' and 'super_admin')
    total_admins = db.query(User).join(User.role).filter(Role.name.in_(["admin", "super_admin"])).count()
    
    # 5. New Registrations (Current Month)
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)
    new_regs = db.query(User).filter(User.created_at >= start_of_month).count()
    
    # 6. Last Login Count (Total audit login entries)
    login_count = db.query(AuditLog).filter(AuditLog.action == "login").count()
    
    # 7. Active Sessions (active token registry counts)
    active_sessions = db.query(UserToken).filter(UserToken.expires_at > datetime.now()).count()

    stats = DashboardStatistics(
        total_students=total_students,
        active_students=active_students,
        inactive_students=inactive_students,
        total_admins=total_admins,
        new_registrations_current_month=new_regs,
        last_login_count=login_count,
        active_sessions=active_sessions
    )

    return ApiResponse(
        success=True,
        message="Dashboard statistics retrieved successfully",
        data=stats
    )

@router.get("/recent-users", response_model=ApiResponse[list[UserResponse]])
def get_recent_users(db: Session = Depends(get_db), current_user: User = Depends(admin_access)):
    """Retrieve the 5 most recently registered students."""
    recent_students = db.query(User).join(User.role).filter(
        Role.name == "student"
    ).order_by(
        User.created_at.desc()
    ).limit(5).all()

    return ApiResponse(
        success=True,
        message="Recent students retrieved successfully",
        data=[UserResponse.model_validate(u) for u in recent_students]
    )

@router.get("/recent-logins", response_model=ApiResponse[list[AuditLogResponse]])
def get_recent_logins(db: Session = Depends(get_db), current_user: User = Depends(admin_access)):
    """Retrieve the 5 most recent login audit events."""
    recent_logins = db.query(AuditLog).filter(
        AuditLog.action == "login"
    ).order_by(
        AuditLog.timestamp.desc()
    ).limit(5).all()

    return ApiResponse(
        success=True,
        message="Recent logins retrieved successfully",
        data=[AuditLogResponse.model_validate(log) for log in recent_logins]
    )

@router.get("/system-info", response_model=ApiResponse[SystemInfoResponse])
def get_system_info(db: Session = Depends(get_db), current_user: User = Depends(admin_access)):
    """Retrieve hosting system metrics and database connection test status."""
    # Test DB status
    db_status = "ONLINE"
    try:
        db.execute(func.select(1))
    except Exception:
        db_status = "OFFLINE"

    # Uptime calculation
    uptime_sec = int(time.time() - START_TIME)
    uptime_str = str(timedelta(seconds=uptime_sec))

    sys_info = SystemInfoResponse(
        os=f"{platform.system()} {platform.release()} ({platform.machine()})",
        python_version=sys.version.split(" ")[0],
        database_status=db_status,
        uptime=uptime_str
    )

    return ApiResponse(
        success=True,
        message="System health diagnostics retrieved successfully",
        data=sys_info
    )

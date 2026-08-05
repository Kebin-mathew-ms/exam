from sqlalchemy import or_, asc, desc, cast, Date
from sqlalchemy.orm import Session, joinedload
from app.models.domain import User, StudentProfile, Role
from datetime import date

class StudentRepository:
    """Repository wrapping SQL queries for student-specific data models."""
    
    @staticmethod
    def get_paginated_students(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: str = None,
        status_id: int = None,
        accessibility_requirement_id: int = None,
        start_date: date = None,
        end_date: date = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> dict:
        # We query Users and filter by 'student' role
        query = db.query(User).join(User.role).filter(Role.name == "student").options(
            joinedload(User.role),
            joinedload(User.status),
            joinedload(User.student_profile).joinedload(StudentProfile.accessibility_requirement)
        )

        # Filters
        if status_id:
            query = query.filter(User.status_id == status_id)
            
        # If we need accessibility requirement filtering or registration number sorting, join profile
        if accessibility_requirement_id or search or sort_by in ["registration_number", "enrollment_number"]:
            query = query.join(User.student_profile)

        if accessibility_requirement_id:
            query = query.filter(StudentProfile.accessibility_requirement_id == accessibility_requirement_id)

        # Date range registrations filter
        if start_date:
            query = query.filter(cast(User.created_at, Date) >= start_date)
        if end_date:
            query = query.filter(cast(User.created_at, Date) <= end_date)

        # Case-insensitive partial search on student and profile values
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(pattern),
                    User.last_name.ilike(pattern),
                    User.email.ilike(pattern),
                    User.phone.ilike(pattern),
                    StudentProfile.enrollment_number.ilike(pattern)
                )
            )

        # Count total records
        total_records = query.count()

        # Sort field resolving
        if sort_by == "first_name":
            sort_field = User.first_name
        elif sort_by in ["registration_number", "enrollment_number"]:
            sort_field = StudentProfile.enrollment_number
        elif sort_by == "status":
            sort_field = User.status_id
        else:
            sort_field = User.created_at

        if sort_order == "asc":
            query = query.order_by(asc(sort_field))
        else:
            query = query.order_by(desc(sort_field))

        # Pagination offsets
        offset = (page - 1) * page_size
        students = query.offset(offset).limit(page_size).all()
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

        return {
            "students": students,
            "total_records": total_records,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size
        }
    
    @staticmethod
    def get_student_by_id(db: Session, student_id: int) -> User:
        """Fetch student detail record by user ID."""
        return db.query(User).join(User.role).filter(
            User.id == student_id,
            Role.name == "student"
        ).options(
            joinedload(User.role),
            joinedload(User.status),
            joinedload(User.student_profile).joinedload(StudentProfile.accessibility_requirement)
        ).first()

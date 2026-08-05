from sqlalchemy import or_, asc, desc
from sqlalchemy.orm import Session, joinedload
from app.models.domain import User

class UserRepository:
    """Repository wrapping SQL queries for the User model, including search, sorting, and pagination."""
    
    @staticmethod
    def get_paginated_users(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: str = None,
        role_id: int = None,
        status_id: int = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> dict:
        # Pre-load relationships to optimize database calls
        query = db.query(User).options(
            joinedload(User.role),
            joinedload(User.status),
            joinedload(User.student_profile)
        )

        # Filters
        if role_id:
            query = query.filter(User.role_id == role_id)
        if status_id:
            query = query.filter(User.status_id == status_id)

        # Case-insensitive partial search
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(pattern),
                    User.last_name.ilike(pattern),
                    User.email.ilike(pattern),
                    User.phone.ilike(pattern)
                )
            )

        # Count total matches
        total_records = query.count()

        # Sorting logic mapping
        sort_field = getattr(User, sort_by, User.created_at)
        if sort_order == "asc":
            query = query.order_by(asc(sort_field))
        else:
            query = query.order_by(desc(sort_field))

        # Pagination bounds
        offset = (page - 1) * page_size
        users = query.offset(offset).limit(page_size).all()
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

        return {
            "users": users,
            "total_records": total_records,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size
        }

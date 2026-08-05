from sqlalchemy import or_, asc, desc
from sqlalchemy.orm import Session, joinedload
from app.models.exam import Exam, ExamQuestion

class ExamRepository:
    """Repository wrapping SQL queries for Exam templates listing, scheduling and detailed counts."""
    
    @staticmethod
    def get_paginated_exams(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: str = None,
        subject_id: int = None,
        status: str = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> dict:
        # Pre-load subject relationships
        query = db.query(Exam).options(
            joinedload(Exam.subject)
        )

        # Filters
        if subject_id:
            query = query.filter(Exam.subject_id == subject_id)
        if status:
            query = query.filter(Exam.status == status)

        # Search query matching Name or Code
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Exam.name.ilike(pattern),
                    Exam.code.ilike(pattern)
                )
            )

        # Count total records
        total_records = query.count()

        # Sorting logic mapping
        sort_field = getattr(Exam, sort_by, Exam.created_at)
        if sort_order == "asc":
            query = query.order_by(asc(sort_field))
        else:
            query = query.order_by(desc(sort_field))

        # Pagination bounds
        offset = (page - 1) * page_size
        exams = query.offset(offset).limit(page_size).all()
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

        return {
            "exams": exams,
            "total_records": total_records,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size
        }
    
    @staticmethod
    def get_exam_by_id(db: Session, exam_id: int) -> Exam:
        """Fetch exam configuration by ID, pre-loading mapped questions."""
        return db.query(Exam).filter(Exam.id == exam_id).options(
            joinedload(Exam.subject),
            joinedload(Exam.questions).joinedload(ExamQuestion.question)
        ).first()

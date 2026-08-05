from sqlalchemy import or_, asc, desc
from sqlalchemy.orm import Session, joinedload
from app.models.exam import Question

class QuestionRepository:
    """Repository wrapping SQL queries for the Question Bank, pre-loading options and categories."""
    
    @staticmethod
    def get_paginated_questions(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: str = None,
        subject_id: int = None,
        category_id: int = None,
        difficulty_id: int = None,
        question_type_id: int = None,
        status: str = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> dict:
        # Pre-load options, subjects, difficulty, categories
        query = db.query(Question).options(
            joinedload(Question.subject),
            joinedload(Question.category),
            joinedload(Question.difficulty),
            joinedload(Question.question_type),
            joinedload(Question.options)
        )

        # Filters
        if subject_id:
            query = query.filter(Question.subject_id == subject_id)
        if category_id:
            query = query.filter(Question.category_id == category_id)
        if difficulty_id:
            query = query.filter(Question.difficulty_id == difficulty_id)
        if question_type_id:
            query = query.filter(Question.question_type_id == question_type_id)
        if status:
            query = query.filter(Question.status == status)

        # Search query matching Title or Description
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Question.title.ilike(pattern),
                    Question.description.ilike(pattern)
                )
            )

        # Count total records
        total_records = query.count()

        # Sorting logic mapping
        sort_field = getattr(Question, sort_by, Question.created_at)
        if sort_order == "asc":
            query = query.order_by(asc(sort_field))
        else:
            query = query.order_by(desc(sort_field))

        # Pagination bounds
        offset = (page - 1) * page_size
        questions = query.offset(offset).limit(page_size).all()
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

        return {
            "questions": questions,
            "total_records": total_records,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size
        }
    
    @staticmethod
    def get_question_by_id(db: Session, question_id: int) -> Question:
        """Fetch question detail record by ID, including its MCQ options."""
        return db.query(Question).filter(Question.id == question_id).options(
            joinedload(Question.subject),
            joinedload(Question.category),
            joinedload(Question.difficulty),
            joinedload(Question.question_type),
            joinedload(Question.options)
        ).first()

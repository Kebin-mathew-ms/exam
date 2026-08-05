from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import io

from app.database.session import get_db
from app.auth.dependencies import RoleChecker
from app.models.exam import Subject, QuestionCategory, DifficultyLevel, QuestionType, Question, QuestionOption
from app.repositories.question_repository import QuestionRepository
from app.schemas.exam_schemas import QuestionCreate, QuestionResponse, LookupResponse
from app.schemas.schemas import ApiResponse, PaginatedResponse
from app.services.import_export_service import ImportExportService
from app.services.audit import log_security_event

router = APIRouter(prefix="/admin/questions", tags=["Question Bank Management"])

admin_access = RoleChecker(["admin", "super_admin"])

@router.get("", response_model=ApiResponse[PaginatedResponse[QuestionResponse]])
def get_questions(
    page: int = 1,
    page_size: int = 10,
    search: Optional[str] = None,
    subject_id: Optional[int] = None,
    category_id: Optional[int] = None,
    difficulty_id: Optional[int] = None,
    question_type_id: Optional[int] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Retrieve a paginated, searchable, sorted, and filtered directory of question bank items."""
    data = QuestionRepository.get_paginated_questions(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        subject_id=subject_id,
        category_id=category_id,
        difficulty_id=difficulty_id,
        question_type_id=question_type_id,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order
    )

    records = [QuestionResponse.model_validate(q) for q in data["questions"]]

    paginated = PaginatedResponse(
        total_records=data["total_records"],
        total_pages=data["total_pages"],
        current_page=data["current_page"],
        page_size=data["page_size"],
        records=records
    )

    return ApiResponse(
        success=True,
        message="Questions loaded successfully",
        data=paginated
    )

@router.post("", response_model=ApiResponse[QuestionResponse], status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Register a new question and map options. (Admin Only)"""
    # Create question parent
    db_question = Question(
        title=payload.title.strip(),
        description=payload.description.strip(),
        subject_id=payload.subject_id,
        category_id=payload.category_id,
        difficulty_id=payload.difficulty_id,
        question_type_id=payload.question_type_id,
        marks=payload.marks,
        negative_marks=payload.negative_marks,
        explanation=payload.explanation.strip() if payload.explanation else None,
        status="active"
    )
    db.add(db_question)
    db.flush()  # Populate ID

    # Create MCQ options if options list exists
    if payload.options:
        for idx, opt in enumerate(payload.options):
            db_option = QuestionOption(
                question_id=db_question.id,
                option_text=opt.option_text.strip(),
                is_correct=opt.is_correct,
                display_order=opt.display_order or (idx + 1)
            )
            db.add(db_option)
            
    db.commit()
    db.refresh(db_question)

    log_security_event(db, user_id=current_user.id, action=f"Question Created: {payload.title}", request=request)

    # Fetch with full relations
    loaded = QuestionRepository.get_question_by_id(db, db_question.id)
    return ApiResponse(
        success=True,
        message="Question created successfully",
        data=QuestionResponse.model_validate(loaded)
    )

@router.get("/lookups")
def get_question_form_lookups(
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Retrieve all lookup tables to populate form selectors."""
    categories = db.query(QuestionCategory).all()
    difficulties = db.query(DifficultyLevel).all()
    qtypes = db.query(QuestionType).all()
    subjects = db.query(Subject).filter(Subject.status == "active").all()
    
    return ApiResponse(
        success=True,
        message="Lookups loaded successfully",
        data={
            "categories": [{"id": c.id, "name": c.name} for c in categories],
            "difficulties": [{"id": d.id, "name": d.name} for d in difficulties],
            "question_types": [{"id": t.id, "name": t.name} for t in qtypes],
            "subjects": [{"id": s.id, "name": f"{s.subject_name} ({s.subject_code})", "code": s.subject_code} for s in subjects]
        }
    )

@router.get("/{question_id}", response_model=ApiResponse[QuestionResponse])
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Retrieve detailed question information."""
    question = QuestionRepository.get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    return ApiResponse(
        success=True,
        message="Question loaded successfully",
        data=QuestionResponse.model_validate(question)
    )

@router.put("/{question_id}", response_model=ApiResponse[QuestionResponse])
def update_question(
    question_id: int,
    payload: QuestionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Modify detailed question data and regenerate option mappings. (Admin Only)"""
    question = QuestionRepository.get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Apply parent fields
    question.title = payload.title.strip()
    question.description = payload.description.strip()
    question.subject_id = payload.subject_id
    question.category_id = payload.category_id
    question.difficulty_id = payload.difficulty_id
    question.question_type_id = payload.question_type_id
    question.marks = payload.marks
    question.negative_marks = payload.negative_marks
    question.explanation = payload.explanation.strip() if payload.explanation else None

    # Clear old options
    db.query(QuestionOption).filter(QuestionOption.question_id == question_id).delete()

    # Re-write options
    if payload.options:
        for idx, opt in enumerate(payload.options):
            db_option = QuestionOption(
                question_id=question_id,
                option_text=opt.option_text.strip(),
                is_correct=opt.is_correct,
                display_order=opt.display_order or (idx + 1)
            )
            db.add(db_option)

    db.commit()
    db.refresh(question)

    log_security_event(db, user_id=current_user.id, action=f"Question Updated: {payload.title}", request=request)

    # Fetch loaded instance
    loaded = QuestionRepository.get_question_by_id(db, question_id)
    return ApiResponse(
        success=True,
        message="Question updated successfully",
        data=QuestionResponse.model_validate(loaded)
    )

@router.delete("/{question_id}", response_model=ApiResponse[dict])
def delete_question(
    question_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Delete question from database and cascades MCQ options. (Admin Only)"""
    question = QuestionRepository.get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    title = question.title
    db.delete(question)
    db.commit()

    log_security_event(db, user_id=current_user.id, action=f"Question Deleted: {title}", request=request)

    return ApiResponse(
        success=True,
        message="Question deleted successfully",
        data={}
    )

@router.post("/photo", response_model=ApiResponse[dict])
def upload_question_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Upload diagram or formula images. Validates sizes (<2MB) and image extensions. (Admin Only)"""
    # Validation size limit (2MB)
    MAX_SIZE = 2 * 1024 * 1024
    content = file.file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 2MB limit.")
    file.file.seek(0)

    # Validate file format extensions
    allowed = [".png", ".jpg", ".jpeg", ".gif"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Allowed extensions are {', '.join(allowed)}")

    # Generate unique filename
    import uuid
    filename = f"q-{uuid.uuid4().hex}{ext}"
    
    # Save file
    os.makedirs("uploads/questions", exist_ok=True)
    filepath = os.path.join("uploads/questions", filename)
    with open(filepath, "wb") as f:
        f.write(content)

    relative_path = f"uploads/questions/{filename}"
    return ApiResponse(
        success=True,
        message="Question file uploaded successfully",
        data={"filepath": relative_path}
    )

@router.post("/import", response_model=ApiResponse[dict])
def import_questions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Import bulk questions from Excel or CSV. Validates data lookup matches. (Admin Only)"""
    content = file.file.read()
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext == ".csv":
        report = ImportExportService.parse_csv_questions(content, db)
    elif ext in (".xlsx", ".xls"):
        report = ImportExportService.parse_excel_questions(content, db)
    else:
        raise HTTPException(status_code=400, detail="Invalid file format. Upload Excel (.xlsx) or CSV.")

    return ApiResponse(
        success=True,
        message="Import process completed.",
        data=report
    )

@router.get("/export")
def export_questions(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user = Depends(admin_access)
):
    """Export the complete Question Bank directory to CSV, Excel, or PDF format. (Admin Only)"""
    questions = db.query(Question).all()
    
    if format.lower() == "csv":
        csv_data = ImportExportService.export_questions_csv(questions)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=questions_export.csv"}
        )
        
    elif format.lower() == "excel":
        excel_data = ImportExportService.export_questions_excel(questions)
        return Response(
            content=excel_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=questions_export.xlsx"}
        )
        
    elif format.lower() == "pdf":
        pdf_data = ImportExportService.export_questions_pdf(questions)
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=questions_export.pdf"}
        )
        
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Supported formats: csv, excel, pdf.")

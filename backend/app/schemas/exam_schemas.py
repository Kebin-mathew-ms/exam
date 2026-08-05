from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# --- Master Lookups ---
class LookupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

# --- Subject Master ---
class SubjectCreate(BaseModel):
    subject_name: str = Field(..., min_length=2, max_length=100)
    subject_code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    status: Optional[str] = "active"

class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    subject_code: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- MCQ Options ---
class QuestionOptionCreate(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False
    display_order: Optional[int] = 1

class QuestionOptionResponse(BaseModel):
    id: int
    option_text: str
    is_correct: bool
    display_order: int

    class Config:
        from_attributes = True

# --- Question Bank ---
class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=2)  # Rich text description
    subject_id: int
    category_id: int
    difficulty_id: int
    question_type_id: int
    marks: Decimal = Field(Decimal("1.00"), ge=0)
    negative_marks: Decimal = Field(Decimal("0.00"), ge=0)
    explanation: Optional[str] = None
    options: List[QuestionOptionCreate] = []

class QuestionResponse(BaseModel):
    id: int
    title: str
    description: str
    subject_id: int
    category_id: int
    difficulty_id: int
    question_type_id: int
    marks: Decimal
    negative_marks: Decimal
    explanation: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    
    # Eager lookups
    subject: Optional[SubjectResponse] = None
    category: Optional[LookupResponse] = None
    difficulty: Optional[LookupResponse] = None
    question_type: Optional[LookupResponse] = None
    options: List[QuestionOptionResponse] = []

    class Config:
        from_attributes = True

# --- Exam Question Mapping ---
class ExamQuestionMappingCreate(BaseModel):
    question_id: int
    display_order: Optional[int] = 1
    marks_override: Optional[Decimal] = None

class ExamQuestionMappingResponse(BaseModel):
    id: int
    question_id: int
    display_order: int
    marks_override: Optional[Decimal] = None
    question: Optional[QuestionResponse] = None

    class Config:
        from_attributes = True

# --- Exam Table ---
class ExamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    subject_id: int
    instructions: Optional[str] = None
    duration_minutes: int = Field(..., ge=1)
    passing_marks: Decimal = Field(..., ge=0)
    total_marks: Decimal = Field(..., ge=1)
    start_date: datetime
    end_date: datetime
    
    # Configuration toggles
    randomize_questions: Optional[bool] = False
    randomize_options: Optional[bool] = False
    show_result_immediately: Optional[bool] = True
    allow_multiple_attempts: Optional[bool] = False
    max_attempts: Optional[int] = 1
    auto_submit: Optional[bool] = True
    
    # Scheduling & Accessibility parameters
    timezone: Optional[str] = "UTC"
    late_entry_allowed: Optional[bool] = False
    grace_time_minutes: Optional[int] = 0
    calculator_allowed: Optional[bool] = False
    negative_marking: Optional[bool] = False
    voice_navigation_availability: Optional[bool] = False
    
    # Map questions
    questions: List[ExamQuestionMappingCreate] = []

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, end_date: datetime, info) -> datetime:
        start_date = info.data.get("start_date")
        if start_date and end_date <= start_date:
            raise ValueError("End date must be chronologically after the start date")
        return end_date

class ExamResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    subject_id: int
    instructions: Optional[str] = None
    duration_minutes: int
    passing_marks: Decimal
    total_marks: Decimal
    start_date: datetime
    end_date: datetime
    status: str
    
    randomize_questions: Optional[bool] = False
    randomize_options: Optional[bool] = False
    show_result_immediately: Optional[bool] = True
    allow_multiple_attempts: Optional[bool] = False
    max_attempts: Optional[int] = 1
    auto_submit: Optional[bool] = True
    timezone: Optional[str] = "UTC"
    late_entry_allowed: Optional[bool] = False
    grace_time_minutes: Optional[int] = 0
    calculator_allowed: Optional[bool] = False
    negative_marking: Optional[bool] = False
    voice_navigation_availability: Optional[bool] = False
    
    created_at: datetime
    updated_at: datetime
    
    subject: Optional[SubjectResponse] = None
    questions: List[ExamQuestionMappingResponse] = []

    class Config:
        from_attributes = True

# --- Student Exam Assignments ---
class StudentAssignmentCreate(BaseModel):
    student_ids: List[int]
    exam_id: int

class StudentAssignmentResponse(BaseModel):
    id: int
    student_id: int
    exam_id: int
    assigned_date: datetime
    status: str
    attempt_count: int
    
    # Mapped models
    exam: Optional[ExamResponse] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None

    class Config:
        from_attributes = True

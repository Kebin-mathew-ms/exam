from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, Text, Numeric, Boolean, func
from sqlalchemy.orm import relationship
from app.database.session import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_name = Column(String(100), nullable=False)
    subject_code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="active")  # 'active', 'inactive'
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    questions = relationship("Question", back_populates="subject", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="subject", cascade="all, delete-orphan")

class QuestionCategory(Base):
    __tablename__ = "question_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class DifficultyLevel(Base):
    __tablename__ = "difficulty_levels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class QuestionType(Base):
    __tablename__ = "question_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)  # Supports Rich Text, LaTeX, HTML, code
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False)
    category_id = Column(Integer, ForeignKey("question_categories.id", ondelete="RESTRICT"), nullable=False)
    difficulty_id = Column(Integer, ForeignKey("difficulty_levels.id", ondelete="RESTRICT"), nullable=False)
    question_type_id = Column(Integer, ForeignKey("question_types.id", ondelete="RESTRICT"), nullable=False)
    
    marks = Column(Numeric(5, 2), default=1.00)
    negative_marks = Column(Numeric(5, 2), default=0.00)
    explanation = Column(Text, nullable=True)
    status = Column(String(20), default="active")  # 'active', 'inactive'
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    subject = relationship("Subject", back_populates="questions")
    category = relationship("QuestionCategory")
    difficulty = relationship("DifficultyLevel")
    question_type = relationship("QuestionType")
    
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")
    exams = relationship("ExamQuestion", back_populates="question", cascade="all, delete-orphan")

class QuestionOption(Base):
    __tablename__ = "question_options"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    option_text = Column(Text, nullable=False)  # Option A, B, C, etc.
    is_correct = Column(Boolean, default=False)
    display_order = Column(Integer, default=1)

    # Relationships
    question = relationship("Question", back_populates="options")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False)
    instructions = Column(Text, nullable=True)
    
    duration_minutes = Column(Integer, nullable=False)
    passing_marks = Column(Numeric(6, 2), nullable=False)
    total_marks = Column(Numeric(6, 2), nullable=False)
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="draft")  # 'draft', 'published', 'archived'
    
    # Configurations
    randomize_questions = Column(Boolean, default=False)
    randomize_options = Column(Boolean, default=False)
    show_result_immediately = Column(Boolean, default=True)
    allow_multiple_attempts = Column(Boolean, default=False)
    max_attempts = Column(Integer, default=1)
    auto_submit = Column(Boolean, default=True)
    
    # Scheduling & Accessibility parameters
    timezone = Column(String(100), default="UTC")
    late_entry_allowed = Column(Boolean, default=False)
    grace_time_minutes = Column(Integer, default=0)
    calculator_allowed = Column(Boolean, default=False)
    negative_marking = Column(Boolean, default=False)
    voice_navigation_availability = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    subject = relationship("Subject", back_populates="exams")
    questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    assignments = relationship("StudentExamAssignment", back_populates="exam", cascade="all, delete-orphan")

class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    display_order = Column(Integer, default=1)
    marks_override = Column(Numeric(5, 2), nullable=True)  # Override default question marks if needed

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    question = relationship("Question", back_populates="exams")

class StudentExamAssignment(Base):
    __tablename__ = "student_exam_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    
    assigned_date = Column(DateTime, server_default=func.now())
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="assigned")  # 'assigned', 'started', 'completed', 'missed'
    attempt_count = Column(Integer, default=0)

    # Relationships
    exam = relationship("Exam", back_populates="assignments")
    student = relationship("User", foreign_keys=[student_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])

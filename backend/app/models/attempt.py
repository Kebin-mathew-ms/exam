from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Boolean, Text, func
from sqlalchemy.orm import relationship
from app.database.session import Base

class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    
    start_time = Column(DateTime, server_default=func.now())
    end_time = Column(DateTime, nullable=False)  # Time when exam must end
    submission_time = Column(DateTime, nullable=True)
    status = Column(String(50), default="started")  # 'started', 'submitted', 'timeout_submitted'
    
    # Grading results
    total_marks_obtained = Column(Numeric(6, 2), default=0.00)
    negative_marks_obtained = Column(Numeric(6, 2), default=0.00)
    final_score = Column(Numeric(6, 2), default=0.00)
    percentage = Column(Numeric(5, 2), default=0.00)
    is_passed = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("User")
    exam = relationship("Exam")
    answers = relationship("StudentAnswer", back_populates="attempt", cascade="all, delete-orphan")
    violations = relationship("BrowserActivityLog", back_populates="attempt", cascade="all, delete-orphan")

class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Answer inputs
    selected_option_id = Column(Integer, ForeignKey("question_options.id", ondelete="SET NULL"), nullable=True)
    text_answer = Column(Text, nullable=True)  # For Short Answer, Fill in blank, Essay
    
    # Navigation Palette states
    is_marked_for_review = Column(Boolean, default=False)
    time_spent_seconds = Column(Integer, default=0)
    last_saved_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    attempt = relationship("ExamAttempt", back_populates="answers")
    question = relationship("Question")
    selected_option = relationship("QuestionOption")

class BrowserActivityLog(Base):
    __tablename__ = "browser_activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    violation_type = Column(String(100), nullable=False)  # 'blur', 'refresh', 'fullscreen_exit', 'tab_switch'
    description = Column(String(255), nullable=True)
    timestamp = Column(DateTime, server_default=func.now())

    # Relationships
    attempt = relationship("ExamAttempt", back_populates="violations")

class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    
    token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    last_heartbeat_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

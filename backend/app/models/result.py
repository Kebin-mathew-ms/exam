from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Boolean, Text, func
from sqlalchemy.orm import relationship
from app.database.session import Base

class GradeMaster(Base):
    __tablename__ = "grade_masters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grade_name = Column(String(20), nullable=False, unique=True)  # A+, A, B, etc.
    min_percentage = Column(Numeric(5, 2), nullable=False)
    max_percentage = Column(Numeric(5, 2), nullable=False)
    description = Column(String(255), nullable=True)

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    examiner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Grading results
    marks_obtained = Column(Numeric(5, 2), default=0.00)
    remarks = Column(Text, nullable=True)
    feedback_strengths = Column(Text, nullable=True)
    feedback_weaknesses = Column(Text, nullable=True)
    
    # AI Assistance suggestions
    ai_suggested_marks = Column(Numeric(5, 2), nullable=True)
    ai_feedback = Column(Text, nullable=True)
    
    status = Column(String(50), default="draft")  # 'draft', 'published'
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    attempt = relationship("ExamAttempt")
    question = relationship("Question")
    examiner = relationship("User")

class EvaluationHistory(Base):
    __tablename__ = "evaluation_histories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id", ondelete="CASCADE"), nullable=False, index=True)
    changer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    old_marks = Column(Numeric(5, 2), nullable=True)
    new_marks = Column(Numeric(5, 2), nullable=False)
    remarks = Column(Text, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())

    # Relationships
    evaluation = relationship("Evaluation")
    changer = relationship("User")

class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Marks details
    total_marks = Column(Numeric(6, 2), nullable=False)
    passing_marks = Column(Numeric(6, 2), nullable=False)
    final_score = Column(Numeric(6, 2), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=False)
    grade = Column(String(20), nullable=True)
    
    # Ranks details
    exam_rank = Column(Integer, nullable=True)
    class_rank = Column(Integer, nullable=True)
    
    status = Column(String(50), nullable=False)  # 'pass', 'fail', 'pending_evaluation'
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    attempt = relationship("ExamAttempt")
    student = relationship("User")
    exam = relationship("Exam")

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    result_id = Column(Integer, ForeignKey("results.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    
    certificate_number = Column(String(100), nullable=False, unique=True, index=True)
    certificate_type = Column(String(50), default="completion")  # 'participation', 'completion', 'merit'
    issue_date = Column(DateTime, server_default=func.now())
    file_path = Column(String(255), nullable=True)
    qr_code_content = Column(Text, nullable=True)
    digital_signature = Column(String(255), nullable=False)

    # Relationships
    student = relationship("User")
    exam = relationship("Exam")
    result = relationship("Result")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="in_app")  # 'in_app', 'email'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User")

class NotificationQueue(Base):
    __tablename__ = "notification_queues"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String(50), nullable=False)  # 'in_app', 'email', 'sms', 'push'
    status = Column(String(50), default="pending")  # 'pending', 'sent', 'failed'
    retry_count = Column(Integer, default=0)
    next_attempt_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class QuestionStatistic(Base):
    __tablename__ = "question_statistics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    
    difficulty_index = Column(Numeric(4, 3), default=0.000)
    discrimination_index = Column(Numeric(4, 3), default=0.000)
    avg_time_spent_seconds = Column(Numeric(6, 2), default=0.00)

    # Relationships
    question = relationship("Question")

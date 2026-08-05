from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.database.session import Base

class AccessibilitySetting(Base):
    __tablename__ = "accessibility_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    
    # Preference fields
    voice_enabled = Column(Boolean, default=False)
    voice_gender = Column(String(20), default="female")  # 'male', 'female'
    voice_speed = Column(Numeric(3, 2), default=1.00)
    voice_pitch = Column(Numeric(3, 2), default=1.00)
    preferred_language = Column(String(10), default="en")  # 'en', 'ml', 'hi'
    
    # Display preferences
    high_contrast_mode = Column(Boolean, default=False)
    large_font_mode = Column(Boolean, default=False)
    keyboard_navigation = Column(Boolean, default=False)
    
    # Auto narrative triggers
    auto_read_question = Column(Boolean, default=False)
    auto_read_options = Column(Boolean, default=False)
    auto_read_instructions = Column(Boolean, default=False)
    voice_confirmation = Column(Boolean, default=False)
    
    # Speech controls
    speech_recognition = Column(Boolean, default=False)
    screen_reader_optimization = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("User")

class VoiceCommandAlias(Base):
    __tablename__ = "voice_command_aliases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    command_key = Column(String(100), nullable=False, index=True)  # e.g., 'NEXT_QUESTION'
    alias_text = Column(String(255), nullable=False, index=True)    # e.g., 'go next', 'അടുത്ത ചോദ്യം'
    language = Column(String(10), default="en")                      # 'en', 'ml', 'hi'

class TtsCache(Base):
    __tablename__ = "tts_caches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    text_hash = Column(String(64), nullable=False, unique=True, index=True)
    audio_base64 = Column(Text, nullable=False)  # Base64 encoded WAV string
    language = Column(String(10), default="en")
    voice_gender = Column(String(20), default="female")
    created_at = Column(DateTime, server_default=func.now())

class OcrCache(Base):
    __tablename__ = "ocr_caches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_hash = Column(String(64), nullable=False, unique=True, index=True)
    extracted_text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class DiagramDescription(Base):
    __tablename__ = "diagram_descriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_hash = Column(String(64), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=False)
    admin_override = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class FormulaCache(Base):
    __tablename__ = "formula_caches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    formula_hash = Column(String(64), nullable=False, unique=True, index=True)
    spoken_explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class SpeechLog(Base):
    __tablename__ = "speech_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    input_transcript = Column(Text, nullable=True)
    detected_command = Column(String(100), nullable=True)
    confidence_score = Column(Numeric(4, 3), nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User")

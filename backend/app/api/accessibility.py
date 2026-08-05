from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import hashlib
import base64

from app.database.session import get_db
from app.auth.dependencies import get_current_active_user
from app.models.accessibility import AccessibilitySetting, VoiceCommandAlias, TtsCache, OcrCache, DiagramDescription, FormulaCache, SpeechLog
from app.models.exam import Question, Exam
from app.models.domain import User
from app.schemas.schemas import ApiResponse

# Import AI Abstractions and Fallbacks
from app.services.fallback_providers import (
    FallbackFormulaInterpreter,
    FallbackTTSProvider,
    FallbackVisionProvider,
    FallbackSpeechProvider
)

router = APIRouter(prefix="/accessibility", tags=["AI Accessibility"])

# Dependency Injection bindings for providers
formula_interpreter = FallbackFormulaInterpreter()
tts_provider = FallbackTTSProvider()
vision_provider = FallbackVisionProvider()
speech_provider = FallbackSpeechProvider()

# --- Request / Response Schemas ---
class UpdateSettingsRequest(BaseModel):
    voice_enabled: bool
    voice_gender: str
    voice_speed: float
    voice_pitch: float
    preferred_language: str
    high_contrast_mode: bool
    large_font_mode: bool
    keyboard_navigation: bool
    auto_read_question: bool
    auto_read_options: bool
    auto_read_instructions: bool
    voice_confirmation: bool
    speech_recognition: bool
    screen_reader_optimization: bool

class ReadQuestionRequest(BaseModel):
    question_id: int

class ReadOptionsRequest(BaseModel):
    question_id: int

class ReadInstructionsRequest(BaseModel):
    exam_id: int

class SpeechCommandRequest(BaseModel):
    transcript: str

class InterpretFormulaRequest(BaseModel):
    formula_text: str
    language: Optional[str] = "en"

# --- Endpoints ---

@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve accessibility settings config for active student."""
    setting = db.query(AccessibilitySetting).filter(AccessibilitySetting.student_id == current_user.id).first()
    if not setting:
        # Create default settings record
        setting = AccessibilitySetting(
            student_id=current_user.id,
            voice_enabled=True,
            voice_gender="female",
            voice_speed=1.00,
            voice_pitch=1.00,
            preferred_language="en",
            keyboard_navigation=True
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)

    return ApiResponse(
        success=True,
        message="Settings loaded successfully",
        data={
            "voice_enabled": setting.voice_enabled,
            "voice_gender": setting.voice_gender,
            "voice_speed": float(setting.voice_speed),
            "voice_pitch": float(setting.voice_pitch),
            "preferred_language": setting.preferred_language,
            "high_contrast_mode": setting.high_contrast_mode,
            "large_font_mode": setting.large_font_mode,
            "keyboard_navigation": setting.keyboard_navigation,
            "auto_read_question": setting.auto_read_question,
            "auto_read_options": setting.auto_read_options,
            "auto_read_instructions": setting.auto_read_instructions,
            "voice_confirmation": setting.voice_confirmation,
            "speech_recognition": setting.speech_recognition,
            "screen_reader_optimization": setting.screen_reader_optimization
        }
    )

@router.put("/settings")
def update_settings(
    payload: UpdateSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Save updated accessibility settings toggles."""
    setting = db.query(AccessibilitySetting).filter(AccessibilitySetting.student_id == current_user.id).first()
    if not setting:
        setting = AccessibilitySetting(student_id=current_user.id)
        db.add(setting)

    # Map settings
    for key, value in payload.dict().items():
        setattr(setting, key, value)

    db.commit()
    db.refresh(setting)

    return ApiResponse(
        success=True,
        message="Settings updated successfully",
        data={}
    )

def get_or_create_tts_cache(db: Session, text: str, lang: str, gender: str, speed: float, pitch: float) -> str:
    """Helper to load base64 wav from TtsCache, or run synthesis and cache."""
    settings_key = f"{text}|{lang}|{gender}|{speed}|{pitch}"
    text_hash = hashlib.sha256(settings_key.encode("utf-8")).hexdigest()

    cached = db.query(TtsCache).filter(TtsCache.text_hash == text_hash).first()
    if cached:
        return cached.audio_base64

    # Synthesize silent WAV bytes fallback
    audio_bytes = tts_provider.text_to_speech(text, lang, gender, speed, pitch)
    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

    # Cache
    new_cache = TtsCache(
        text_hash=text_hash,
        audio_base64=audio_base64,
        language=lang,
        voice_gender=gender
    )
    db.add(new_cache)
    db.commit()

    return audio_base64

@router.post("/read-question")
def read_question(
    payload: ReadQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Convert question title + description into cached spoken audio."""
    q = db.query(Question).filter(Question.id == payload.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # Strip HTML tags for clean narration
    clean_text = re.sub(r'<[^>]*>', '', q.description)
    narration = f"Question: {q.title}. {clean_text}"

    # Get student settings
    setting = db.query(AccessibilitySetting).filter(AccessibilitySetting.student_id == current_user.id).first()
    lang = setting.preferred_language if setting else "en"
    gender = setting.voice_gender if setting else "female"
    speed = float(setting.voice_speed) if setting else 1.00
    pitch = float(setting.voice_pitch) if setting else 1.00

    audio_base64 = get_or_create_tts_cache(db, narration, lang, gender, speed, pitch)

    return ApiResponse(
        success=True,
        message="Question text narrated",
        data={"audio_base64": audio_base64}
    )

@router.post("/read-options")
def read_options(
    payload: ReadOptionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Convert options list into single audio narrative stream."""
    q = db.query(Question).filter(Question.id == payload.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    options_text = []
    labels = ["A", "B", "C", "D", "E"]
    for idx, opt in enumerate(q.options):
        label = labels[idx] if idx < len(labels) else str(idx + 1)
        options_text.append(f"Option {label}: {opt.option_text}")

    narration = ". ".join(options_text)

    setting = db.query(AccessibilitySetting).filter(AccessibilitySetting.student_id == current_user.id).first()
    lang = setting.preferred_language if setting else "en"
    gender = setting.voice_gender if setting else "female"
    speed = float(setting.voice_speed) if setting else 1.00
    pitch = float(setting.voice_pitch) if setting else 1.00

    audio_base64 = get_or_create_tts_cache(db, narration, lang, gender, speed, pitch)

    return ApiResponse(
        success=True,
        message="Options narrated",
        data={"audio_base64": audio_base64}
    )

@router.post("/read-instructions")
def read_instructions(
    payload: ReadInstructionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Convert exam instructions text into speech narration."""
    exam = db.query(Exam).filter(Exam.id == payload.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    clean_text = re.sub(r'<[^>]*>', '', exam.instructions)
    narration = f"Instructions for exam {exam.name}: {clean_text}"

    setting = db.query(AccessibilitySetting).filter(AccessibilitySetting.student_id == current_user.id).first()
    lang = setting.preferred_language if setting else "en"
    gender = setting.voice_gender if setting else "female"
    speed = float(setting.voice_speed) if setting else 1.00
    pitch = float(setting.voice_pitch) if setting else 1.00

    audio_base64 = get_or_create_tts_cache(db, narration, lang, gender, speed, pitch)

    return ApiResponse(
        success=True,
        message="Instructions narrated",
        data={"audio_base64": audio_base64}
    )

import re

@router.post("/interpret-formula")
def interpret_formula(
    payload: InterpretFormulaRequest,
    db: Session = Depends(get_db)
):
    """Interpret LaTeX syntax into spoken plain text."""
    formula_hash = hashlib.sha256(payload.formula_text.encode("utf-8")).hexdigest()

    cached = db.query(FormulaCache).filter(FormulaCache.formula_hash == formula_hash).first()
    if cached:
        return ApiResponse(
            success=True,
            message="Formula interpreted",
            data={"spoken_explanation": cached.spoken_explanation}
        )

    # Run interpreter
    explanation = formula_interpreter.interpret_formula(payload.formula_text, payload.language)
    
    # Save cache
    new_cache = FormulaCache(
        formula_hash=formula_hash,
        spoken_explanation=explanation
    )
    db.add(new_cache)
    db.commit()

    return ApiResponse(
        success=True,
        message="Formula interpreted",
        data={"spoken_explanation": explanation}
    )

@router.post("/describe-image")
def describe_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Run fallback AI descriptors over image buffers."""
    image_bytes = file.file.read()
    image_hash = hashlib.sha256(image_bytes).hexdigest()

    cached = db.query(DiagramDescription).filter(DiagramDescription.image_hash == image_hash).first()
    if cached:
        return ApiResponse(
            success=True,
            message="Image description loaded",
            data={"description": cached.admin_override or cached.description}
        )

    # Run vision
    desc = vision_provider.describe_image(image_bytes)
    
    new_cache = DiagramDescription(
        image_hash=image_hash,
        description=desc
    )
    db.add(new_cache)
    db.commit()

    return ApiResponse(
        success=True,
        message="Image description generated",
        data={"description": desc}
    )

@router.post("/extract-text")
def extract_text(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Run fallback OCR text extraction on uploaded files."""
    image_bytes = file.file.read()
    image_hash = hashlib.sha256(image_bytes).hexdigest()

    cached = db.query(OcrCache).filter(OcrCache.image_hash == image_hash).first()
    if cached:
        return ApiResponse(
            success=True,
            message="OCR extracted text loaded",
            data={"extracted_text": cached.extracted_text}
        )

    # Run vision
    text = vision_provider.extract_text(image_bytes)
    
    new_cache = OcrCache(
        image_hash=image_hash,
        extracted_text=text
    )
    db.add(new_cache)
    db.commit()

    return ApiResponse(
        success=True,
        message="OCR text extracted successfully",
        data={"extracted_text": text}
    )

@router.post("/speech-command")
def process_speech_command(
    payload: SpeechCommandRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Parse transcript matches to map student commands with punctuation cleaning and keyword fallback."""
    import re
    raw_transcript = payload.transcript.strip()
    
    # 1. Clean trailing punctuation and normalize to lowercase
    transcript = re.sub(r'[.\x21\x3f,]+$', '', raw_transcript.lower()).strip()

    # 2. Database exact match check
    alias = db.query(VoiceCommandAlias).filter(VoiceCommandAlias.alias_text == transcript).first()
    
    detected = "UNKNOWN"
    confidence = 0.20

    if alias:
        detected = alias.command_key
        confidence = 0.95
    else:
        # 3. Smart pattern/keyword fallbacks when exact match fails
        # English matches
        if "next" in transcript or "forward" in transcript:
            detected = "NEXT_QUESTION"
            confidence = 0.85
        elif "previous" in transcript or "back" in transcript:
            detected = "PREV_QUESTION"
            confidence = 0.85
        elif "submit" in transcript or "finish" in transcript:
            detected = "SUBMIT_EXAM"
            confidence = 0.90
        elif re.search(r'\b(select|option|answer|choose)\s+a\b', transcript) or transcript == "a":
            detected = "ANSWER_A"
            confidence = 0.85
        elif re.search(r'\b(select|option|answer|choose)\s+b\b', transcript) or transcript == "b":
            detected = "ANSWER_B"
            confidence = 0.85
        elif re.search(r'\b(select|option|answer|choose)\s+c\b', transcript) or transcript == "c":
            detected = "ANSWER_C"
            confidence = 0.85
        elif re.search(r'\b(select|option|answer|choose)\s+d\b', transcript) or transcript == "d":
            detected = "ANSWER_D"
            confidence = 0.85
        elif "clear" in transcript or "erase" in transcript or "delete" in transcript:
            detected = "CLEAR_ANSWER"
            confidence = 0.80
        elif "save" in transcript:
            detected = "SAVE_ANSWER"
            confidence = 0.80
        elif "review" in transcript or "later" in transcript:
            detected = "MARK_REVIEW"
            confidence = 0.80
        elif "repeat" in transcript or "read" in transcript:
            detected = "REPEAT_QUESTION"
            confidence = 0.80
        # Malayalam matches
        elif any(w in transcript for w in ["അടുത്ത", "അടുത്തത്"]):
            detected = "NEXT_QUESTION"
            confidence = 0.85
        elif "മുൻപത്തെ" in transcript or "മുൻപ്" in transcript:
            detected = "PREV_QUESTION"
            confidence = 0.85
        elif "സമർ" in transcript or "സബ്മിറ്റ്" in transcript:
            detected = "SUBMIT_EXAM"
            confidence = 0.85

    # Log command event
    log = SpeechLog(
        user_id=current_user.id,
        input_transcript=raw_transcript,
        detected_command=detected,
        confidence_score=confidence,
        processing_time_ms=10
    )
    db.add(log)
    db.commit()

    return ApiResponse(
        success=True,
        message="Speech command processed",
        data={
            "detected_command": detected,
            "confidence": confidence
        }
    )

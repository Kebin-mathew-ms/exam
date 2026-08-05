from abc import ABC, abstractmethod

class SpeechProviderInterface(ABC):
    """Interface for processing speech recognition / audio transcribing."""
    
    @abstractmethod
    def transcribe_audio(self, audio_bytes: bytes, language: str) -> dict:
        """Transcribe speech audio bytes, returning text and confidence score."""
        pass

class TTSProviderInterface(ABC):
    """Interface for generating natural text to speech audio clips."""
    
    @abstractmethod
    def text_to_speech(self, text: str, language: str, gender: str, speed: float, pitch: float) -> bytes:
        """Synthesize text, returning audio WAV/MP3 raw bytes."""
        pass

class VisionProviderInterface(ABC):
    """Interface for extracting text via OCR or describing diagram images."""
    
    @abstractmethod
    def describe_image(self, image_bytes: bytes) -> str:
        """Generate textual description of diagram/chart image."""
        pass
        
    @abstractmethod
    def extract_text(self, image_bytes: bytes) -> str:
        """Run OCR to extract embedded text from document/question image."""
        pass

class FormulaInterpreterInterface(ABC):
    """Interface for translating LaTeX/MathML equations into natural spoken text."""
    
    @abstractmethod
    def interpret_formula(self, formula_text: str, language: str) -> str:
        """Translate mathematical/physics formulas to readable text."""
        pass

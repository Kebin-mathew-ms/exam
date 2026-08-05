import struct
import base64
import re
import hashlib
from typing import Dict

from app.services.ai_providers import (
    SpeechProviderInterface,
    TTSProviderInterface,
    VisionProviderInterface,
    FormulaInterpreterInterface
)

class FallbackFormulaInterpreter(FormulaInterpreterInterface):
    """Local, rule-based LaTeX/MathML tokenizer converting math expressions to human-spoken words."""
    
    def interpret_formula(self, formula_text: str, language: str) -> str:
        text = formula_text.strip()
        
        # Strip outer delimiters $ or $$
        text = re.sub(r'^\$\$?|\$\$?$', '', text)
        
        # Rule translation mapping
        replacements = [
            (r'\\int', 'integral of '),
            (r'dx', ' with respect to x'),
            (r'dy', ' with respect to y'),
            (r'dt', ' with respect to t'),
            (r'\^2|²', ' squared'),
            (r'\^3|³', ' cubed'),
            (r'\+', ' plus '),
            (r'-', ' minus '),
            (r'\\times|\*', ' times '),
            (r'\\div|/', ' divided by '),
            (r'=', ' equals '),
            (r'\\frac\{([^}]+)\}\{([^}]+)\}', r'\1 over \2'),
            (r'\\sqrt\{([^}]+)\}', r'square root of \1'),
            (r'\\sum', 'summation of '),
            (r'\\alpha', 'alpha'),
            (r'\\beta', 'beta'),
            (r'\\theta', 'theta'),
            (r'\\pi', 'pi'),
            (r'\\infty', 'infinity'),
            (r'[\{\}]', ' '),  # Strip remaining brackets
        ]

        for pattern, replacement in replacements:
            text = re.compile(pattern).sub(replacement, text)

        # Sanitize double spaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Simple Translation for mock Hindi/Malayalam
        if language == "hi":
            # Translate basic connectors to Hindi
            text = text.replace("plus", "धन").replace("minus", "ऋण").replace("equals", "बराबर है")
        elif language == "ml":
            # Translate basic connectors to Malayalam
            text = text.replace("plus", "കൂട്ടുക").replace("minus", "കുറയ്ക്കുക").replace("equals", "തുല്യം")

        return text

class FallbackTTSProvider(TTSProviderInterface):
    """Generates a valid brief silent WAV file (PCM 16-bit Mono, 8000Hz) returned as raw bytes."""

    def text_to_speech(self, text: str, language: str, gender: str, speed: float, pitch: float) -> bytes:
        sample_rate = 8000
        num_channels = 1
        bits_per_sample = 16
        duration_seconds = 1.0
        
        # Data size for 1 second of silence
        data_size = int(sample_rate * duration_seconds * (bits_per_sample // 8))
        chunk_size = 36 + data_size
        
        # Write WAV format headers
        header = struct.pack(
            '<4sI4s4sIHHIIHH4sI',
            b'RIFF',
            chunk_size,
            b'WAVE',
            b'fmt ',
            16,              # Subchunk1Size
            1,               # AudioFormat (1 = PCM)
            num_channels,
            sample_rate,
            int(sample_rate * num_channels * (bits_per_sample // 8)), # ByteRate
            int(num_channels * (bits_per_sample // 8)),             # BlockAlign
            bits_per_sample,
            b'data',
            data_size
        )
        
        # 1-second silent PCM audio data
        audio_data = b'\x00' * data_size
        return header + audio_data

class FallbackVisionProvider(VisionProviderInterface):
    """Fallback OCR extraction and diagram descriptors."""

    def describe_image(self, image_bytes: bytes) -> str:
        # Detect simple markers to return matching dummy data
        img_str = image_bytes.decode('utf-8', errors='ignore')
        if "bar" in img_str.lower():
            return "A bar chart representation showing monthly score variations."
        if "pie" in img_str.lower():
            return "A pie chart showing proportional distribution of student pass outcomes."
        return "A geometry diagram displaying a triangle with sides a, b, and c."

    def extract_text(self, image_bytes: bytes) -> str:
        return "OCR Output: Solve the formula x^2 + 5 = 14 for x."

class FallbackSpeechProvider(SpeechProviderInterface):
    """Decodes basic voice triggers matching transcript checks."""

    def transcribe_audio(self, audio_bytes: bytes, language: str) -> dict:
        # Returns a mock transcription
        return {
            "transcript": "go next",
            "confidence": 0.95
        }

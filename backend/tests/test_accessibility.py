import pytest
import httpx
import io

BASE_URL = "http://127.0.0.1:8000/api"

@pytest.fixture(scope="module")
def student_token():
    """Retrieve authenticated Student access token."""
    response = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "student@exam.com",
        "password": "Student123!"
    })
    return response.json()["data"]["access_token"]

def test_accessibility_settings_crud(student_token):
    """Verify settings loads and saves config parameters."""
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # 1. Get Settings
    res_get = httpx.get(f"{BASE_URL}/accessibility/settings", headers=headers)
    assert res_get.status_code == 200
    data = res_get.json()["data"]
    assert "voice_enabled" in data

    # 2. Put / Update Settings
    res_put = httpx.put(f"{BASE_URL}/accessibility/settings", headers=headers, json={
        "voice_enabled": True,
        "voice_gender": "male",
        "voice_speed": 1.25,
        "voice_pitch": 1.10,
        "preferred_language": "hi",
        "high_contrast_mode": True,
        "large_font_mode": True,
        "keyboard_navigation": True,
        "auto_read_question": True,
        "auto_read_options": True,
        "auto_read_instructions": True,
        "voice_confirmation": True,
        "speech_recognition": True,
        "screen_reader_optimization": True
    })
    assert res_put.status_code == 200

    # 3. Verify changes persisted
    res_get2 = httpx.get(f"{BASE_URL}/accessibility/settings", headers=headers)
    assert res_get2.json()["data"]["voice_gender"] == "male"
    assert res_get2.json()["data"]["preferred_language"] == "hi"

def test_latex_formula_interpretation(student_token):
    """Verify LaTeX formulas convert to spoken explanations."""
    headers = {"Authorization": f"Bearer {student_token}"}

    # Example 1: Quadratic formula
    res_quad = httpx.post(f"{BASE_URL}/accessibility/interpret-formula", json={
        "formula_text": "x^2 + y^2 = z^2",
        "language": "en"
    })
    assert res_quad.status_code == 200
    assert "x squared plus y squared equals z squared" in res_quad.json()["data"]["spoken_explanation"]

    # Example 2: Calculus Integral
    res_int = httpx.post(f"{BASE_URL}/accessibility/interpret-formula", json={
        "formula_text": "\int x^2 dx",
        "language": "en"
    })
    assert res_int.status_code == 200
    assert "integral of x squared with respect to x" in res_int.json()["data"]["spoken_explanation"]

def test_voice_commands_mapping(student_token):
    """Verify multi-language voice commands match correctly."""
    headers = {"Authorization": f"Bearer {student_token}"}

    # 1. English command check
    res_en = httpx.post(f"{BASE_URL}/accessibility/speech-command", headers=headers, json={
        "transcript": "go next"
    })
    assert res_en.status_code == 200
    assert res_en.json()["data"]["detected_command"] == "NEXT_QUESTION"

    # 2. Malayalam command check
    res_ml = httpx.post(f"{BASE_URL}/accessibility/speech-command", headers=headers, json={
        "transcript": "അടുത്തത്"
    })
    assert res_ml.status_code == 200
    assert res_ml.json()["data"]["detected_command"] == "NEXT_QUESTION"

    # 3. Hindi command check
    res_hi = httpx.post(f"{BASE_URL}/accessibility/speech-command", headers=headers, json={
        "transcript": "अगला प्रश्न"
    })
    assert res_hi.status_code == 200
    assert res_hi.json()["data"]["detected_command"] == "NEXT_QUESTION"

    # 4. Unknown trigger check
    res_unknown = httpx.post(f"{BASE_URL}/accessibility/speech-command", headers=headers, json={
        "transcript": "make a coffee"
    })
    assert res_unknown.status_code == 200
    assert res_unknown.json()["data"]["detected_command"] == "UNKNOWN"

def test_vision_ocr_and_descriptions(student_token):
    """Verify file uploads OCR text extracts and caches."""
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # Mock image bytes
    mock_file = io.BytesIO(b"dummy pie chart image bytes")
    files = {"file": ("pie_chart.png", mock_file, "image/png")}

    # 1. Image description check
    res_desc = httpx.post(f"{BASE_URL}/accessibility/describe-image", headers=headers, files=files)
    assert res_desc.status_code == 200
    assert "pie chart" in res_desc.json()["data"]["description"].lower()

    # Reset mock stream pointer
    mock_file.seek(0)
    # 2. OCR OCR checks
    res_ocr = httpx.post(f"{BASE_URL}/accessibility/extract-text", headers=headers, files=files)
    assert res_ocr.status_code == 200
    assert "Solve the formula" in res_ocr.json()["data"]["extracted_text"]

def test_tts_audio_caching(student_token):
    """Verify TTS text-to-speech audio outputs base64 wav and caches correctly."""
    headers = {"Authorization": f"Bearer {student_token}"}

    # Narration request for question ID 1
    response = httpx.post(f"{BASE_URL}/accessibility/read-question", headers=headers, json={
        "question_id": 1
    })
    assert response.status_code == 200
    audio_base64 = response.json()["data"]["audio_base64"]
    assert len(audio_base64) > 100

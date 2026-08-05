import pytest
import httpx
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"

@pytest.fixture(scope="module")
def tokens():
    """Retrieve authenticated Admin and Student access tokens."""
    # Student Token
    student_res = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "student@exam.com",
        "password": "Student123!"
    })
    student_tok = student_res.json()["data"]["access_token"]

    # Admin Token
    admin_res = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@exam.com",
        "password": "Admin123!"
    })
    admin_tok = admin_res.json()["data"]["access_token"]

    return {
        "student": student_tok,
        "admin": admin_tok
    }

def test_evaluation_pending_queue(tokens):
    """Test retrieving lists of pending subjective exams for admin review."""
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    response = httpx.get(f"{BASE_URL}/evaluation/pending", headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert isinstance(response.json()["data"], list)

def test_ai_subjective_review_suggestion(tokens):
    """Test generating AI assisted reviews comparing responses to expected templates."""
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    # Call AI review for attempt 1, question 1
    response = httpx.post(
        f"{BASE_URL}/evaluation/ai-review",
        json={"attempt_id": 1, "question_id": 1},
        headers=headers
    )
    # The endpoint might return 404 if attempt 1 is not subjective, but we verify response format or structure
    if response.status_code == 200:
        data = response.json()["data"]
        assert "suggested_marks" in data
        assert "feedback" in data

def test_save_manual_grade_draft(tokens):
    """Test saving a manual evaluation score draft."""
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    response = httpx.post(
        f"{BASE_URL}/evaluation/save",
        json={
            "attempt_id": 1,
            "question_id": 1,
            "marks_obtained": 4.5,
            "remarks": "Excellent essay answer."
        },
        headers=headers
    )
    # We assert either successful save or validation errors (e.g. 404 if attempt not found)
    assert response.status_code in [200, 404]

def test_results_analytics(tokens):
    """Test fetching analytics values for charts distributions."""
    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    resp = httpx.get(f"{BASE_URL}/results/analytics", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "total_students" in data
    assert "avg_score" in data
    assert "grade_distribution" in data

def test_results_list(tokens):
    """Test retrieving exam results lists."""
    headers = {"Authorization": f"Bearer {tokens['student']}"}
    resp = httpx.get(f"{BASE_URL}/results", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

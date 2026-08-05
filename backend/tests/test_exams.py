import pytest
import httpx
import io
import uuid
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000/api"

@pytest.fixture(scope="module")
def admin_token():
    """Retrieve Super Admin access token for exam controllers testing."""
    response = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@exam.com",
        "password": "Admin123!"
    })
    return response.json()["data"]["access_token"]

def test_subjects_crud_and_duplicates(admin_token):
    """Verify subjects CRUD and duplicate code constraints."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    unique_code = f"SUB-{uuid.uuid4().hex[:6].upper()}"
    
    # 1. Create unique subject
    response = httpx.post(f"{BASE_URL}/admin/subjects", headers=headers, json={
        "subject_name": "Calculus II",
        "subject_code": unique_code,
        "description": "Integration and infinite series syllabus.",
        "status": "active"
    })
    assert response.status_code == 201
    assert response.json()["success"] is True

    # 2. Assert duplicate code triggers 400 error
    response_dup = httpx.post(f"{BASE_URL}/admin/subjects", headers=headers, json={
        "subject_name": "Another Calculus",
        "subject_code": unique_code,
        "description": "Should fail.",
        "status": "active"
    })
    assert response_dup.status_code == 400
    assert "already registered" in response_dup.json()["errors"][0]

def test_questions_crud_and_lookups(admin_token):
    """Verify question lookups and creation mappings."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Verify lookups list endpoint loaded
    response_lk = httpx.get(f"{BASE_URL}/admin/questions/lookups", headers=headers)
    assert response_lk.status_code == 200
    assert "categories" in response_lk.json()["data"]

    # 2. Create MCQ Question
    response_q = httpx.post(f"{BASE_URL}/admin/questions", headers=headers, json={
        "title": "Algebra Equality Check",
        "description": "<p>Solve for x: 2x + 5 = 15</p>",
        "subject_id": 1,
        "category_id": 1,
        "difficulty_id": 1,
        "question_type_id": 1, # MCQ
        "marks": 2.50,
        "negative_marks": 0.50,
        "explanation": "2x = 10, hence x = 5",
        "options": [
            {"option_text": "x = 5", "is_correct": True, "display_order": 1},
            {"option_text": "x = 10", "is_correct": False, "display_order": 2}
        ]
    })
    assert response_q.status_code == 201
    assert response_q.json()["data"]["title"] == "Algebra Equality Check"
    assert len(response_q.json()["data"]["options"]) == 2

def test_questions_import_parsing(admin_token):
    """Verify file parsing returns correct parsed count report."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Generate CSV content matching lookup values (subject: CS101, category: Programming, type: MCQ)
    csv_content = (
        "title,description,subject_code,category,difficulty,question_type,marks,negative_marks,explanation,options,correct_option\n"
        "Python Tuple immutable,Tuples are immutable in Python.,CS101,Programming,Easy,Multiple Choice,2.00,0.00,Tuples cannot be altered.,Yes;No,Yes\n"
    )
    
    files = {"file": ("import.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = httpx.post(f"{BASE_URL}/admin/questions/import", headers=headers, files=files)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["success_count"] == 1
    assert data["failure_count"] == 0

def test_exam_validation_and_cloning(admin_token):
    """Verify date constraints, templates creation, and clone triggers."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    unique_exam_code = f"EXAM-{uuid.uuid4().hex[:6].upper()}"
    
    # 1. Invalid Dates check (end date before start date)
    now = datetime.now()
    invalid_payload = {
        "name": "Invalid Schedule Exam",
        "code": "EXAM-FAIL-01",
        "subject_id": 1,
        "duration_minutes": 30,
        "passing_marks": 5.0,
        "total_marks": 10.0,
        "start_date": (now + timedelta(days=2)).isoformat(),
        "end_date": now.isoformat(), # Chronologically before start
        "questions": []
    }
    response_invalid = httpx.post(f"{BASE_URL}/admin/exams", headers=headers, json=invalid_payload)
    assert response_invalid.status_code == 422 # Pydantic Validation Error

    # 2. Valid Exam template creation
    valid_payload = {
        "name": "Linear Algebra Exam",
        "code": unique_exam_code,
        "subject_id": 1,
        "duration_minutes": 90,
        "passing_marks": 10.0,
        "total_marks": 20.0,
        "start_date": now.isoformat(),
        "end_date": (now + timedelta(days=5)).isoformat(),
        "questions": [
            {"question_id": 1, "display_order": 1, "marks_override": 5.0}
        ]
    }
    response_valid = httpx.post(f"{BASE_URL}/admin/exams", headers=headers, json=valid_payload)
    assert response_valid.status_code == 201
    exam_id = response_valid.json()["data"]["id"]

    # 3. Trigger Exam Template Clone
    response_clone = httpx.post(f"{BASE_URL}/admin/exams/{exam_id}/clone", headers=headers)
    assert response_clone.status_code == 200
    clone_data = response_clone.json()["data"]
    assert clone_data["status"] == "draft"
    assert f"CLONE-{unique_exam_code}" in clone_data["code"]

def test_student_exam_assignment(admin_token):
    """Verify bulk student assignments to scheduled exam templates."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Assign Exam ID 1 to Student ID 3 (the seeded student)
    response = httpx.post(f"{BASE_URL}/admin/assignments", headers=headers, json={
        "student_ids": [3],
        "exam_id": 1
      })
    assert response.status_code == 201
    assert "skipped" in response.json()["data"]

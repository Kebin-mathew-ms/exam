import pytest
import httpx
import uuid
from datetime import datetime, timedelta

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

def test_student_dashboard(tokens):
    """Verify student dashboard stats load successfully."""
    headers = {"Authorization": f"Bearer {tokens['student']}"}
    response = httpx.get(f"{BASE_URL}/student/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "upcoming_exams" in data["data"]

def test_student_assigned_exams(tokens):
    """Verify assigned exams directory lists active slots."""
    headers = {"Authorization": f"Bearer {tokens['student']}"}
    response = httpx.get(f"{BASE_URL}/student/exams", headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_exam_taking_security_checks(tokens):
    """Verify correct answer key indexes are hidden when fetching exam details."""
    headers = {"Authorization": f"Bearer {tokens['student']}"}
    response = httpx.get(f"{BASE_URL}/student/exams/1", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Assert questions and options exist
    questions = data["data"]["questions"]
    assert len(questions) >= 1
    
    # CRITICAL: Verify is_correct flag is STRIPPED from options
    first_opt = questions[0]["options"][0]
    assert "is_correct" not in first_opt

def test_exam_start_save_and_violation_flow(tokens):
    """Verify attempt session starts, logs blurs, auto-saves, and submits on a dynamically assigned exam."""
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    student_headers = {"Authorization": f"Bearer {tokens['student']}"}
    
    rand_id = uuid.uuid4().hex[:6].upper()
    now = datetime.now()

    # 1. Create a Unique Subject
    res_sub = httpx.post(f"{BASE_URL}/admin/subjects", headers=admin_headers, json={
        "subject_name": f"Dynamic Calculus {rand_id}",
        "subject_code": f"MATH-{rand_id}",
        "description": "Dynamic testing syllabus.",
        "status": "active"
    })
    assert res_sub.status_code == 201
    subject_id = res_sub.json()["data"]["id"]

    # 2. Create MCQ Question
    res_q = httpx.post(f"{BASE_URL}/admin/questions", headers=admin_headers, json={
        "title": f"Dynamic Algebra Question {rand_id}",
        "description": "<p>Evaluate dynamic expression.</p>",
        "subject_id": subject_id,
        "category_id": 1,
        "difficulty_id": 1,
        "question_type_id": 1, # MCQ
        "marks": 5.00,
        "negative_marks": 1.00,
        "explanation": "No explanation.",
        "options": [
            {"option_text": "Option A (Correct)", "is_correct": True, "display_order": 1},
            {"option_text": "Option B (Wrong)", "is_correct": False, "display_order": 2}
        ]
    })
    assert res_q.status_code == 201
    q_data = res_q.json()["data"]
    question_id = q_data["id"]
    option_a_id = q_data["options"][0]["id"]

    # 3. Create Exam Template
    res_exam = httpx.post(f"{BASE_URL}/admin/exams", headers=admin_headers, json={
        "name": f"Dynamic Test Exam {rand_id}",
        "code": f"EXAM-{rand_id}",
        "subject_id": subject_id,
        "duration_minutes": 45,
        "passing_marks": 4.00,
        "total_marks": 10.00,
        "start_date": now.isoformat(),
        "end_date": (now + timedelta(days=2)).isoformat(),
        "questions": [
            {"question_id": question_id, "display_order": 1, "marks_override": 5.00}
        ]
    })
    assert res_exam.status_code == 201
    exam_id = res_exam.json()["data"]["id"]

    # 4. Assign to Student ID 2 (the seeded student@exam.com user has ID 2)
    res_assign = httpx.post(f"{BASE_URL}/admin/assignments", headers=admin_headers, json={
        "student_ids": [2],
        "exam_id": exam_id
    })
    assert res_assign.status_code == 201

    # 5. Start Exam Attempt as Student
    res_start = httpx.post(f"{BASE_URL}/student/exams/start", headers=student_headers, json={"exam_id": exam_id})
    assert res_start.status_code == 200
    attempt_id = res_start.json()["data"]["attempt_id"]

    # 6. Log browser violation focus loss
    res_viol = httpx.post(f"{BASE_URL}/student/exams/violation", headers=student_headers, json={
        "attempt_id": attempt_id,
        "violation_type": "blur",
        "description": "Student left browser window."
    })
    assert res_viol.status_code == 200

    # 7. Save Option A response
    res_save = httpx.post(f"{BASE_URL}/student/exams/save-answer", headers=student_headers, json={
        "attempt_id": attempt_id,
        "question_id": question_id,
        "selected_option_id": option_a_id,
        "text_answer": "",
        "time_spent_seconds": 25,
        "is_marked_for_review": False
    })
    assert res_save.status_code == 200

    # 8. Submit Attempt and verify evaluation yields passing score
    res_submit = httpx.post(f"{BASE_URL}/student/exams/submit", headers=student_headers, json={"attempt_id": attempt_id})
    assert res_submit.status_code == 200
    grade = res_submit.json()["data"]
    
    assert float(grade["score"]) == 5.00
    assert grade["is_passed"] is True

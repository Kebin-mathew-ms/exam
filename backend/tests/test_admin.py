import pytest
import httpx
import io

BASE_URL = "http://127.0.0.1:8000/api"

@pytest.fixture(scope="module")
def tokens():
    """Authenticate and retrieve active access tokens for test calls."""
    # 1. Super Admin Login
    response = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@exam.com",
        "password": "Admin123!"
    })
    super_admin_token = response.json()["data"]["access_token"]

    # 2. Normal Admin Login
    response = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "staff@exam.com",
        "password": "Admin123!"
    })
    normal_admin_token = response.json()["data"]["access_token"]

    return {
        "super_admin": super_admin_token,
        "normal_admin": normal_admin_token
    }

def test_admin_dashboard_statistics(tokens):
    """Verify statistics can be retrieved by administrators."""
    headers = {"Authorization": f"Bearer {tokens['normal_admin']}"}
    response = httpx.get(f"{BASE_URL}/admin/dashboard/statistics", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "total_students" in data["data"]
    assert "active_sessions" in data["data"]

def test_student_list_pagination_and_search(tokens):
    """Verify search, pagination and sorting queries are functional."""
    headers = {"Authorization": f"Bearer {tokens['normal_admin']}"}
    params = {
        "page": 1,
        "page_size": 2,
        "search": "student",
        "sort_by": "created_at",
        "sort_order": "desc"
      }
    response = httpx.get(f"{BASE_URL}/admin/students", headers=headers, params=params)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "records" in data["data"]
    assert data["data"]["current_page"] == 1

def test_duplicate_validation_rules(tokens):
    """Verify duplicate registration details raise unprocessable/bad requests."""
    headers = {"Authorization": f"Bearer {tokens['normal_admin']}"}
    # Create user with duplicate email 'student@exam.com'
    response = httpx.post(f"{BASE_URL}/admin/students", headers=headers, json={
        "first_name": "Test",
        "last_name": "Student",
        "email": "student@exam.com",
        "phone": "+9999999999",
        "password": "Password123!"
    })
    # FastAPI returns status code 400 or 422 for duplication violations
    assert response.status_code == 400
    assert response.json()["success"] is False

def test_role_authorization_guards(tokens):
    """Verify normal admin cannot delete admin accounts."""
    # Attempting deletion of admin id 1 (Super Admin) using normal admin token
    headers = {"Authorization": f"Bearer {tokens['normal_admin']}"}
    response = httpx.delete(f"{BASE_URL}/admin/admins/1", headers=headers)
    assert response.status_code == 403
    assert response.json()["success"] is False

def test_photo_upload_file_rules(tokens):
    """Verify profile photo validation rules block invalid files."""
    headers = {"Authorization": f"Bearer {tokens['normal_admin']}"}
    
    # 1. Reject invalid extensions (e.g. text/plain file)
    files = {"file": ("test.txt", io.BytesIO(b"dummy text content"), "text/plain")}
    response = httpx.post(f"{BASE_URL}/admin/students/2/photo", headers=headers, files=files)
    assert response.status_code == 400
    assert "Allowed extensions" in response.json()["errors"][0]

    # 2. Reject file sizes exceeding limit (mocked via size)
    large_content = b"x" * (2 * 1024 * 1024 + 100) # Exceeds 2MB limit
    files_large = {"file": ("image.png", io.BytesIO(large_content), "image/png")}
    response_large = httpx.post(f"{BASE_URL}/admin/students/2/photo", headers=headers, files=files_large)
    assert response_large.status_code == 400
    assert "exceeds" in response_large.json()["errors"][0]

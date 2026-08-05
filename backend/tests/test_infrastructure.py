import pytest
import httpx

from app.services.cache_service import cache_service
from app.services.storage_service import storage_service

BASE_URL = "http://127.0.0.1:8000/api"

def test_health_endpoints():
    """Verify general, db, cache and storage health checks are responding."""
    # 1. General check
    r_gen = httpx.get(f"{BASE_URL}/health")
    assert r_gen.status_code == 200
    assert r_gen.json()["data"]["status"] == "UP"

    # 2. Database check
    r_db = httpx.get(f"{BASE_URL}/health/database")
    assert r_db.status_code == 200
    assert r_db.json()["data"]["status"] == "UP"

    # 3. Cache check
    r_cache = httpx.get(f"{BASE_URL}/health/cache")
    assert r_cache.status_code == 200

    # 4. Storage check
    r_store = httpx.get(f"{BASE_URL}/health/storage")
    assert r_store.status_code == 200
    assert "free_space_gb" in r_store.json()["data"]

def test_cache_client_set_and_get():
    """Test get and set caching keys."""
    # Write key
    assert cache_service.set("test_key_123", "value_abc", expire_seconds=30) is True
    # Retrieve key
    assert cache_service.get("test_key_123") == "value_abc"
    # Delete key
    assert cache_service.delete("test_key_123") is True
    assert cache_service.get("test_key_123") is None

def test_cache_client_token_blacklist():
    """Test blacklist queries."""
    jti = "mock-jti-token-hash"
    assert cache_service.is_token_blacklisted(jti) is False
    cache_service.blacklist_token(jti, expire_seconds=60)
    assert cache_service.is_token_blacklisted(jti) is True

def test_storage_mime_type_validators():
    """Test storage validations for permitted Content-Types using duck-typing mock files."""
    # Valid image type
    f_valid = type('MockFile', (), {'filename': 'avatar.png', 'content_type': 'image/png'})()
    assert storage_service.validate_file(f_valid) is True

    # Invalid shell script type
    f_invalid = type('MockFile', (), {'filename': 'hack.sh', 'content_type': 'application/x-sh'})()
    with pytest.raises(Exception):
        storage_service.validate_file(f_invalid)

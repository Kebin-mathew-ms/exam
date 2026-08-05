import pytest
from fastapi import UploadFile
import io

from app.services.s3_storage_service import s3_storage_service

def test_s3_storage_fallback_uploader():
    """Verify S3 service defaults gracefully to local uploader when AWS keys are absent."""
    # Build dynamic mock upload file
    f_mock = type('MockFile', (), {
        'filename': 'test_sheet.txt',
        'file': io.BytesIO(b"Cloud metrics report"),
        'content_type': 'text/plain'
    })()

    # If AWS variables are not configured in test environment
    if not s3_storage_service.use_s3:
        # Save should execute and write to uploads/temp or uploads/reports
        relative_path = s3_storage_service.upload_file(f_mock, "temp")
        assert "temp/" in relative_path
        # Assert written file exists
        assert os.path.exists(os.path.join("uploads", relative_path))
        # Cleanup
        os.remove(os.path.join("uploads", relative_path))
    else:
        # If credentials exist, execute uploader check
        print("S3 uploader active in test runner environment.")

import os

import os
import uuid
import shutil
import time
from typing import Optional
from fastapi import UploadFile, HTTPException

from app.config.settings import settings
from app.utils.logger import logger

class StorageService:
    """Manages files structure directory validation sizes checks and virus scans hooks."""

    ALLOWED_MIME_TYPES = {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
    }

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB Max File Size limit

    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIRECTORY
        self.directories = {
            "profile-images": os.path.join(self.upload_dir, "profile-images"),
            "question-images": os.path.join(self.upload_dir, "question-images"),
            "answer-files": os.path.join(self.upload_dir, "answer-files"),
            "certificates": os.path.join(self.upload_dir, "certificates"),
            "reports": os.path.join(self.upload_dir, "reports"),
            "temp": os.path.join(self.upload_dir, "temp")
        }
        self.initialize_directories()

    def initialize_directories(self):
        """Build directories tree if missing."""
        for dir_path in self.directories.values():
            os.makedirs(dir_path, exist_ok=True)

    def scan_file_for_virus(self, file_path: str) -> bool:
        """Mock scan interface returning True for clean. Ready for ClamAV mapping."""
        logger.info(f"File scan initiated for: {file_path}")
        return True

    def validate_file(self, file: UploadFile) -> bool:
        """Validate content type and check size ranges limits."""
        if file.content_type not in self.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Supported types: PNG, JPEG, GIF, PDF, DOCX, TXT."
            )
        return True

    def save_file(self, file: UploadFile, folder: str) -> str:
        """Save upload file to target directory using a unique generated name."""
        if folder not in self.directories:
            raise HTTPException(status_code=400, detail="Invalid target folder directory specified.")

        self.validate_file(file)

        # Build unique filename
        ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(self.directories[folder], unique_name)

        # Write stream chunk
        file_size = 0
        try:
            with open(dest_path, "wb") as buffer:
                while True:
                    chunk = file.file.read(8192)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    if file_size > self.MAX_FILE_SIZE:
                        # Exceeded limits
                        raise HTTPException(status_code=413, detail="File size limit exceeded. Max is 5MB.")
                    buffer.write(chunk)
        except Exception as e:
            # Clean up partial files
            if os.path.exists(dest_path):
                os.remove(dest_path)
            raise e

        # Scan
        if not self.scan_file_for_virus(dest_path):
            os.remove(dest_path)
            raise HTTPException(status_code=400, detail="Security Warning: Malware detected in uploaded file.")

        # Return relative filepath
        relative_path = os.path.join(folder, unique_name)
        return relative_path.replace("\\", "/")

    def clear_temp_folder(self, expiration_seconds: int = 3600):
        """Clean files in temp folder older than expiration timeframe."""
        temp_dir = self.directories["temp"]
        now = time.time()
        for f in os.listdir(temp_dir):
            fpath = os.path.join(temp_dir, f)
            if os.stat(fpath).st_mtime < now - expiration_seconds:
                if os.path.isfile(fpath):
                    os.remove(fpath)
                elif os.path.isdir(fpath):
                    shutil.rmtree(fpath)
        logger.info("Temporary storage directory cleanup executed.")

storage_service = StorageService()

import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException, status
from app.config.settings import settings

MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}

class UploadService:
    """Service to handle profile image uploads, validation, storage, and cleanups."""
    
    @staticmethod
    def validate_image(file: UploadFile):
        """Validate the image extension and size constraints."""
        # 1. Validate File Extension
        filename = file.filename or ""
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # 2. Validate File Size
        try:
            # Seek to end to determine file size, then restore pointer position
            file.file.seek(0, os.SEEK_END)
            size = file.file.tell()
            file.file.seek(0)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to read file size stream metadata"
            )

        if size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum allowed limit of 2MB"
            )

    @staticmethod
    def save_profile_image(file: UploadFile, old_photo_path: str = None) -> str:
        """Save a new profile image to uploads/profile-images/ and delete the old one."""
        # Validate file rules
        UploadService.validate_image(file)

        # Target directory structure
        upload_dir = os.path.join(settings.UPLOAD_DIRECTORY, "profile-images")
        os.makedirs(upload_dir, exist_ok=True)

        # Generate unique filename using UUID
        ext = (file.filename or "image.jpg").split(".")[-1].lower()
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        dest_path = os.path.join(upload_dir, unique_name)

        # Copy SpooledTemporaryFile to destination path
        try:
            with open(dest_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write image file: {str(e)}"
            )

        # Delete outdated photo file if registered
        if old_photo_path:
            normalized_path = os.path.normpath(old_photo_path)
            # Ensure path starts with the configured upload directory (prevent directory traversal exploits)
            if (normalized_path.startswith(settings.UPLOAD_DIRECTORY) or 
                normalized_path.startswith("uploads")) and os.path.exists(normalized_path):
                try:
                    os.remove(normalized_path)
                except Exception:
                    pass  # Silent failure to avoid breaking user updates on failed cleanups

        # Return database relative path
        relative_path = f"{settings.UPLOAD_DIRECTORY}/profile-images/{unique_name}"
        return relative_path

    @staticmethod
    def delete_profile_image(photo_path: str):
        """Safely delete a profile image."""
        if photo_path:
            normalized_path = os.path.normpath(photo_path)
            if (normalized_path.startswith(settings.UPLOAD_DIRECTORY) or 
                normalized_path.startswith("uploads")) and os.path.exists(normalized_path):
                try:
                    os.remove(normalized_path)
                except Exception:
                    pass

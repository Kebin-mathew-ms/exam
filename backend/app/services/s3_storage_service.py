import os
import boto3
from botocore.exceptions import NoCredentialsError
from fastapi import UploadFile, HTTPException

from app.services.storage_service import storage_service
from app.utils.logger import logger

class S3StorageService:
    """Enterprise S3 cloud uploader with automatic fallback to local directory storage."""

    def __init__(self):
        self.bucket_name = os.getenv("AWS_STORAGE_BUCKET_NAME", "")
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID", "")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "")
        
        self.use_s3 = False
        self.s3_client = None

        if self.bucket_name and self.access_key and self.secret_key:
            try:
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key
                )
                self.use_s3 = True
                logger.info(f"AWS S3 Cloud Storage initialized for bucket: {self.bucket_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize S3 client: {e}. Falling back to local storage.")
                self.use_s3 = False
        else:
            logger.info("AWS S3 environment variables not configured. Using local disk uploader.")

    def upload_file(self, file: UploadFile, folder: str) -> str:
        """Upload target file to S3 bucket or local folder partition."""
        if not self.use_s3:
            # Fallback to local
            return storage_service.save_file(file, folder)

        # Validate file
        storage_service.validate_file(file)

        ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
        unique_name = f"{folder}/{uuid.uuid4().hex}{ext}"

        try:
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                unique_name,
                ExtraArgs={"ContentType": file.content_type}
            )
            # Return S3 URL
            return f"https://{self.bucket_name}.s3.amazonaws.com/{unique_name}"
        except NoCredentialsError:
            logger.error("AWS S3 credentials invalid. Upload failed.")
            raise HTTPException(status_code=500, detail="Cloud storage credentials invalid.")
        except Exception as e:
            logger.error(f"S3 Upload failed: {e}")
            raise HTTPException(status_code=500, detail=f"S3 uploader error: {e}")

import uuid
s3_storage_service = S3StorageService()

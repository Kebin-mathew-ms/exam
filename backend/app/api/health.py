import os
import shutil
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.session import get_db
from app.services.cache_service import cache_service
from app.schemas.schemas import ApiResponse
from app.config.settings import settings

router = APIRouter(prefix="/health", tags=["System Health Checks"])

@router.get("")
def health_general():
    """Verify system API is healthy and reachable."""
    return ApiResponse(
        success=True,
        message="Aegis System is healthy",
        data={"status": "UP"}
    )

@router.get("/database")
def health_database(db: Session = Depends(get_db)):
    """Verify MySQL database connection is live and querying."""
    try:
        db.execute(text("SELECT 1"))
        return ApiResponse(
            success=True,
            message="Database link is active",
            data={"status": "UP"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database check failed: {e}")

@router.get("/cache")
def health_cache():
    """Verify cache server connectivity."""
    if cache_service.use_redis:
        try:
            cache_service.client.ping()
            return ApiResponse(
                success=True,
                message="Redis cache cluster is online",
                data={"status": "UP", "provider": "Redis"}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Redis cache ping failed: {e}")
    
    return ApiResponse(
        success=True,
        message="System using local memory fallback cache",
        data={"status": "DEGRADED", "provider": "LocalMemory"}
    )

@router.get("/storage")
def health_storage():
    """Verify local uploads storage has write authorization and adequate disk capacity."""
    upload_dir = settings.UPLOAD_DIRECTORY
    try:
        # Check read/write capabilities
        temp_file = os.path.join(upload_dir, ".healthcheck")
        with open(temp_file, "w") as f:
            f.write("OK")
        os.remove(temp_file)

        # Retrieve disk statistics
        total, used, free = shutil.disk_usage(upload_dir)
        return ApiResponse(
            success=True,
            message="Uploads file storage directory is writable",
            data={
                "status": "UP",
                "free_space_gb": round(free / (1024 ** 3), 2),
                "total_space_gb": round(total / (1024 ** 3), 2)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage permissions check failed: {e}")

@router.get("/ai")
def health_ai():
    """Check availability of simulated AI models and services."""
    return ApiResponse(
        success=True,
        message="AI mock services ready",
        data={"status": "UP", "nlp_status": "UP", "vision_status": "UP"}
    )

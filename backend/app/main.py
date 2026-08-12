import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config.settings import settings
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.students import router as students_router
from app.api.admin_dashboard import router as admin_dashboard_router
from app.api.admin_management import router as admin_management_router
from app.api.profile import router as profile_router

# Prompt 3 Routers
from app.api.subjects import router as subjects_router
from app.api.questions import router as questions_router
from app.api.exams import router as exams_router
from app.api.assignments import router as assignments_router

# Prompt 4 Router
from app.api.student_portal import router as student_portal_router

# Prompt 5 Router
from app.api.accessibility import router as accessibility_router

# Prompt 6 Routers
from app.api.evaluation import router as evaluation_router
from app.api.results import router as results_router
from app.api.certificates import router as certificates_router
from app.api.notifications import router as notifications_router

# Prompt 7 Router
from app.api.health import router as health_router

from app.middleware.exception_handler import (
    validation_exception_handler,
    http_exception_handler,
    general_exception_handler
)
from app.utils.logger import logger

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI instance
app = FastAPI(
    title="AI-Powered Accessible Online Examination System",
    description="Backend API Foundation (Admin Portal and Student Examination Portals)",
    version="1.3.0"
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register Custom Exception Handlers for Unified Response Formatting
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
import uuid
from app.core.logging_config import log_event

# Custom Middleware for Request ID tracking, performance logging and clickjacking headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex)
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    log_event("performance", f"API Request: {request.method} {request.url.path} | Duration: {duration:.4f}s | Request ID: {request_id}")
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; img-src 'self' data: http://localhost:8000;"
    return response

# Startup tasks
@app.on_event("startup")
def on_startup():
    # Ensure Upload Directories exist
    os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIRECTORY, "profile-images"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIRECTORY, "questions"), exist_ok=True)
    logger.info(f"Upload directory configured at: {settings.UPLOAD_DIRECTORY}")
    logger.info("FastAPI Application backend is starting up.")

# Mount uploads static folder so photos can be requested/rendered
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register routes under /api
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(students_router, prefix="/api")
app.include_router(admin_dashboard_router, prefix="/api")
app.include_router(admin_management_router, prefix="/api")
app.include_router(profile_router, prefix="/api")

# Prompt 3 routers
app.include_router(subjects_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(exams_router, prefix="/api")
app.include_router(assignments_router, prefix="/api")

# Prompt 4 router
app.include_router(student_portal_router, prefix="/api")

# Prompt 5 router
app.include_router(accessibility_router, prefix="/api")

# Prompt 6 routers
app.include_router(evaluation_router, prefix="/api")
app.include_router(results_router, prefix="/api")
app.include_router(certificates_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")

# Prompt 7 health router mount
app.include_router(health_router, prefix="/api")

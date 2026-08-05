from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.utils.logger import error_logger

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic validation errors into the standardized error format."""
    errors = []
    for error in exc.errors():
        loc = error.get("loc", [])
        # Extract cleaner field name from validation location
        field = ".".join([str(x) for x in loc[1:]]) if len(loc) > 1 else str(loc[0]) if loc else "body"
        msg = error.get("msg", "Invalid value")
        errors.append(f"{field}: {msg}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation Error",
            "errors": errors
        }
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Formats standard FastAPI HTTPExceptions."""
    # Ensure error is inside array
    errors = [exc.detail] if isinstance(exc.detail, str) else exc.detail if isinstance(exc.detail, list) else [str(exc.detail)]
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(exc.detail),
            "errors": errors
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Catches all other unhandled code errors, preventing stack traces from leaking."""
    error_logger.exception(f"Unhandled error on path {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An internal server error occurred.",
            "errors": [str(exc)]
        }
    )

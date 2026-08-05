import re
from typing import Optional, List, Any, Generic, TypeVar
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date

T = TypeVar('T')

# Common API Response Wrapper
class ApiResponse(BaseModel, Generic[T]):
    success: bool
    message: str = ""
    data: Optional[T] = None
    errors: Optional[List[str]] = []

# Email and Phone regex patterns
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PHONE_REGEX = re.compile(r"^\+?[\d\s\-()]{7,20}$")

# Lookup Schemas
class RoleSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class UserStatusSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class AccessibilityRequirementSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

# Student Profile Schemas
class StudentProfileBase(BaseModel):
    enrollment_number: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    guardian_name: Optional[str] = Field(None, max_length=100)
    guardian_phone: Optional[str] = Field(None, max_length=20)
    emergency_contact: Optional[str] = Field(None, max_length=255)
    preferred_language: Optional[str] = Field(None, max_length=50)
    accessibility_requirement_id: Optional[int] = None

class StudentProfileCreate(StudentProfileBase):
    pass

class StudentProfileUpdate(StudentProfileBase):
    pass

class StudentProfileResponse(StudentProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    accessibility_requirement: Optional[AccessibilityRequirementSchema] = None

    class Config:
        from_attributes = True

# User Base Schemas
class UserBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=20)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: str) -> str:
        if not EMAIL_REGEX.match(value):
            raise ValueError("Invalid email format")
        return value.lower()

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, value: str) -> str:
        if not PHONE_REGEX.match(value):
            raise ValueError("Invalid phone number format")
        return value

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role_id: int
    status_id: int

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValueError("Password must contain at least one special character")
        return value

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    role_id: Optional[int] = None
    status_id: Optional[int] = None
    profile_photo: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            if not EMAIL_REGEX.match(value):
                raise ValueError("Invalid email format")
            return value.lower()
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            if not PHONE_REGEX.match(value):
                raise ValueError("Invalid phone number format")
            return value
        return value

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            if len(value) < 8:
                raise ValueError("Password must be at least 8 characters long")
            if not re.search(r"[A-Z]", value):
                raise ValueError("Password must contain at least one uppercase letter")
            if not re.search(r"[a-z]", value):
                raise ValueError("Password must contain at least one lowercase letter")
            if not re.search(r"\d", value):
                raise ValueError("Password must contain at least one digit")
            if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
                raise ValueError("Password must contain at least one special character")
        return value

class UserResponse(UserBase):
    id: int
    role_id: int
    status_id: int
    profile_photo: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    role: RoleSchema
    status: UserStatusSchema
    student_profile: Optional[StudentProfileResponse] = None

    class Config:
        from_attributes = True

# Login & Token Schemas
class UserLogin(BaseModel):
    email: str
    password: str

class TokenData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

# Audit Logs
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    module: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# Admin Password Change
class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_pw_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValueError("Password must contain at least one special character")
        return value

# Statistics Response Schemas
class DashboardStatistics(BaseModel):
    total_students: int
    active_students: int
    inactive_students: int
    total_admins: int
    new_registrations_current_month: int
    last_login_count: int
    active_sessions: int

class SystemInfoResponse(BaseModel):
    os: str
    python_version: str
    database_status: str
    uptime: str

# Paginated Responses
class PaginatedResponse(BaseModel, Generic[T]):
    total_records: int
    total_pages: int
    current_page: int
    page_size: int
    records: List[T]

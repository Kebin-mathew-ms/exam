from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config.settings import settings

# Create database engine with connection pooling config
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # checks connection health on check-out
    pool_size=10,        # keeps up to 10 connections active
    max_overflow=20      # allows up to 20 additional overflow connections
)

# Create session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy models
Base = declarative_base()

# FastAPI DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

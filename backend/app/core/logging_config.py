import os
import logging
from logging.handlers import RotatingFileHandler

# Build logs folder path
LOGS_DIR = "logs"
os.makedirs(LOGS_DIR, exist_ok=True)

# Common Formatter
FORMATTER = logging.Formatter(
    '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
)

def create_rotating_handler(filename: str, level: int = logging.INFO) -> RotatingFileHandler:
    """Create rotating log file handlers with 10MB sizes max caps and 5 backups files index."""
    handler = RotatingFileHandler(
        os.path.join(LOGS_DIR, filename),
        maxBytes=10 * 1024 * 1024, # 10MB
        backupCount=5,
        encoding="utf-8"
    )
    handler.setLevel(level)
    handler.setFormatter(FORMATTER)
    return handler

# Base logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')

# Structured loggers
app_logger = logging.getLogger("app")
app_logger.addHandler(create_rotating_handler("app.log"))

error_logger = logging.getLogger("error")
error_logger.addHandler(create_rotating_handler("error.log", logging.ERROR))

auth_logger = logging.getLogger("auth")
auth_logger.addHandler(create_rotating_handler("auth.log"))

ai_logger = logging.getLogger("ai")
ai_logger.addHandler(create_rotating_handler("ai.log"))

perf_logger = logging.getLogger("performance")
perf_logger.addHandler(create_rotating_handler("performance.log"))

logger_instances = {
    "app": app_logger,
    "error": error_logger,
    "auth": auth_logger,
    "ai": ai_logger,
    "performance": perf_logger
}

def log_event(logger_name: str, message: str, level: str = "info"):
    """Global utility dispatcher log interface."""
    logger = logger_instances.get(logger_name, app_logger)
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(message)

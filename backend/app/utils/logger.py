import os
import logging
from logging.handlers import RotatingFileHandler

# Define logs directory relative to project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGS_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

# Standard log formatters
CONSOLE_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
FILE_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(filename)s:%(lineno)d | %(message)s"

def setup_logger():
    # Root Logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Prevent duplicating logs in console if configured multiple times
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(CONSOLE_FORMAT)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # General App File Handler (rotating log file)
    app_log_file = os.path.join(LOGS_DIR, "app.log")
    file_handler = RotatingFileHandler(app_log_file, maxBytes=10*1024*1024, backupCount=5)
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(FILE_FORMAT)
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)

    # Dedicated Auth Log Handler
    auth_logger = logging.getLogger("auth")
    auth_logger.setLevel(logging.INFO)
    auth_log_file = os.path.join(LOGS_DIR, "auth.log")
    auth_file_handler = RotatingFileHandler(auth_log_file, maxBytes=5*1024*1024, backupCount=5)
    auth_file_handler.setLevel(logging.INFO)
    auth_file_handler.setFormatter(file_formatter)
    auth_logger.addHandler(auth_file_handler)
    auth_logger.propagate = False # prevent printing auth logs twice to root console

    # Dedicated Error Log Handler
    error_logger = logging.getLogger("error")
    error_logger.setLevel(logging.ERROR)
    error_log_file = os.path.join(LOGS_DIR, "error.log")
    error_file_handler = RotatingFileHandler(error_log_file, maxBytes=5*1024*1024, backupCount=5)
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(file_formatter)
    error_logger.addHandler(error_file_handler)
    # Error logger will also propagate to standard console output

    logging.info("Logging initialized successfully.")

# Setup logging immediately on module load
setup_logger()

# Export loggers
logger = logging.getLogger("app")
auth_logger = logging.getLogger("auth")
error_logger = logging.getLogger("error")

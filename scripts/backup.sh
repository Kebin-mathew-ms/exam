#!/bin/bash
# Aegis Backup Automation Script

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
UPLOADS_BACKUP_FILE="${BACKUP_DIR}/uploads_backup_${TIMESTAMP}.tar.gz"

# Create backup folder
mkdir -p "${BACKUP_DIR}"

echo "Starting database dump..."
# Verify database access (using environment parameters or defaults)
DB_USER=${DATABASE_USER:-exam_user}
DB_PASS=${DATABASE_PASSWORD:-Password123!}
DB_NAME=${DATABASE_NAME:-examination_db}
DB_HOST=${DATABASE_HOST:-localhost}

mysqldump -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" | gzip > "${DB_BACKUP_FILE}"
if [ $? -eq 0 ]; then
    echo "Database backup created successfully: ${DB_BACKUP_FILE}"
else
    echo "Error: Database backup failed."
fi

echo "Starting assets backup..."
tar -czf "${UPLOADS_BACKUP_FILE}" uploads/
if [ $? -eq 0 ]; then
    echo "Assets uploads backup created: ${UPLOADS_BACKUP_FILE}"
else
    echo "Error: Assets backup failed."
fi

# Rotate backups, keeping only 5 most recent files
echo "Rotating old backups..."
find "${BACKUP_DIR}" -type f -name "db_backup_*" | sort -r | tail -n +6 | xargs -I {} rm -- {}
find "${BACKUP_DIR}" -type f -name "uploads_backup_*" | sort -r | tail -n +6 | xargs -I {} rm -- {}

echo "Backup execution completed."

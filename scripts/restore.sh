#!/bin/bash
# Aegis Restoration Automation Script

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./restore.sh <path_to_db_backup.sql.gz> <path_to_uploads_backup.tar.gz>"
    exit 1
fi

DB_FILE=$1
UPLOADS_FILE=$2

DB_USER=${DATABASE_USER:-exam_user}
DB_PASS=${DATABASE_PASSWORD:-Password123!}
DB_NAME=${DATABASE_NAME:-examination_db}
DB_HOST=${DATABASE_HOST:-localhost}

echo "Restoring database from: ${DB_FILE}..."
gunzip -c "${DB_FILE}" | mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"
if [ $? -eq 0 ]; then
    echo "Database query updates restored successfully."
else
    echo "Error: Database restoration failed."
fi

echo "Restoring assets uploads from: ${UPLOADS_FILE}..."
tar -xzf "${UPLOADS_FILE}" -C .
if [ $? -eq 0 ]; then
    echo "Assets uploads folders extracted successfully."
else
    echo "Error: Assets extraction failed."
fi

echo "Restoration completed."

#!/bin/bash

# Tax Genius Pro - Database Backup Script
# Runs daily at 2:00 AM via cron

# Configuration
BACKUP_DIR="/root/backups/taxgeniuspro"
DB_NAME="taxgeniuspro"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/taxgeniuspro_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Extract database connection details from .env.local
DB_URL=$(grep DATABASE_URL /root/websites/taxgeniuspro/.env.local | cut -d'=' -f2-)

# Perform backup
echo "Starting backup at $(date)"
pg_dump "${DB_URL}" | gzip > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "Backup completed successfully: ${BACKUP_FILE}"

    # Calculate file size
    SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
    echo "Backup size: ${SIZE}"

    # Delete backups older than retention period
    find ${BACKUP_DIR} -name "taxgeniuspro_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    echo "Cleaned up backups older than ${RETENTION_DAYS} days"

    # Log success
    echo "$(date): Backup successful - ${BACKUP_FILE} (${SIZE})" >> ${BACKUP_DIR}/backup.log
else
    echo "Backup failed!"
    echo "$(date): Backup FAILED" >> ${BACKUP_DIR}/backup.log
    exit 1
fi

echo "Backup completed at $(date)"

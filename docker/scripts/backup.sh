#!/bin/sh
# Mobility4You Database Backup Script
# ===================================

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"
BACKUP_FILE="mobility4you_backup_${TIMESTAMP}.sql"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Database connection details
DB_HOST="db"
DB_NAME=${MYSQL_DATABASE}
DB_USER="root"
DB_PASSWORD=${MYSQL_ROOT_PASSWORD}

echo "Starting database backup at $(date)"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform the backup
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --databases $DB_NAME > $BACKUP_DIR/$BACKUP_FILE

# Compress the backup
gzip $BACKUP_DIR/$BACKUP_FILE

echo "Backup completed: ${BACKUP_FILE}.gz"

# Clean up old backups (keep only last N days)
find $BACKUP_DIR -name "mobility4you_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup cleanup completed. Keeping backups for $RETENTION_DAYS days"
echo "Backup finished at $(date)"

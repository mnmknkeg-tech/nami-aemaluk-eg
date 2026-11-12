#!/bin/bash

# Backup Script for Ray Marketplace
# This script backs up PostgreSQL database and Redis data

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-ray_marketplace}"
POSTGRES_USER="${POSTGRES_USER:-ray_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-ray_password}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $(date)"

# PostgreSQL Backup
echo "Backing up PostgreSQL database..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  --compress=9 \
  "$BACKUP_DIR/postgres_${TIMESTAMP}.dump"

echo "PostgreSQL backup completed: postgres_${TIMESTAMP}.dump"

# Redis Backup
echo "Backing up Redis data..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

echo "Redis backup completed: redis_${TIMESTAMP}.rdb"

# Elasticsearch Backup (optional)
if [ -n "$ELASTICSEARCH_URL" ]; then
  echo "Backing up Elasticsearch snapshots..."
  # Create snapshot repository and take snapshot
  curl -X PUT "$ELASTICSEARCH_URL/_snapshot/backup_repo" -H 'Content-Type: application/json' -d'
  {
    "type": "fs",
    "settings": {
      "location": "/usr/share/elasticsearch/backups"
    }
  }'
  
  curl -X PUT "$ELASTICSEARCH_URL/_snapshot/backup_repo/snapshot_$TIMESTAMP?wait_for_completion=true"
  echo "Elasticsearch backup completed"
fi

# Clean old backups
echo "Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "postgres_*.dump" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully at $(date)"
echo "Backup location: $BACKUP_DIR"

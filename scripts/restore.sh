#!/bin/bash

# Restore Script for Ray Marketplace
# This script restores PostgreSQL database and Redis data from backup

set -e

# Configuration
BACKUP_DIR="./backups"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-ray_marketplace}"
POSTGRES_USER="${POSTGRES_USER:-ray_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-ray_password}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_timestamp>"
  echo "Example: $0 20240713_120000"
  echo ""
  echo "Available backups:"
  ls -1 "$BACKUP_DIR"/postgres_*.dump 2>/dev/null | xargs -I {} basename {} .dump | sed 's/postgres_//'
  exit 1
fi

TIMESTAMP=$1
POSTGRES_BACKUP="$BACKUP_DIR/postgres_${TIMESTAMP}.dump"
REDIS_BACKUP="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

echo "Starting restore at $(date)"

# Check if backup files exist
if [ ! -f "$POSTGRES_BACKUP" ]; then
  echo "Error: PostgreSQL backup not found: $POSTGRES_BACKUP"
  exit 1
fi

# PostgreSQL Restore
echo "Restoring PostgreSQL database..."
echo "Warning: This will replace the current database. Continue? (y/n)"
read -r response
if [ "$response" != "y" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Drop existing database
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"

# Create new database
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "CREATE DATABASE $POSTGRES_DB;"

# Restore from backup
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  --clean \
  --if-exists \
  "$POSTGRES_BACKUP"

echo "PostgreSQL restore completed"

# Redis Restore (if backup exists)
if [ -f "$REDIS_BACKUP" ]; then
  echo "Restoring Redis data..."
  
  # Stop Redis
  docker-compose stop redis
  
  # Copy RDB file to Redis data directory
  cp "$REDIS_BACKUP" ./redis_data/dump.rdb
  
  # Start Redis
  docker-compose start redis
  
  echo "Redis restore completed"
else
  echo "Redis backup not found: $REDIS_BACKUP"
  echo "Skipping Redis restore"
fi

echo "Restore completed successfully at $(date)"

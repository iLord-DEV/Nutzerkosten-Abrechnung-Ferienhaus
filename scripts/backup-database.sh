#!/bin/bash

# Datenbank-Backup-Skript für MySQL
# Verwendung: ./scripts/backup-database.sh

# Konfiguration
DB_NAME="nutzerkosten_db"
DB_USER="root"
DB_HOST="localhost"
DB_PORT="3306"

# Backup-Verzeichnis
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${DATE}.sql"

# Backup-Verzeichnis erstellen
mkdir -p "$BACKUP_DIR"

echo "🔄 Erstelle Datenbank-Backup..."
echo "📁 Ziel: $BACKUP_FILE"

# MySQL-Dump erstellen
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup erfolgreich erstellt: $BACKUP_FILE"
    
    # Backup komprimieren
    gzip "$BACKUP_FILE"
    echo "📦 Backup komprimiert: ${BACKUP_FILE}.gz"
    
    # Alte Backups löschen (älter als 30 Tage)
    find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -mtime +30 -delete
    echo "🗑️  Alte Backups (>30 Tage) gelöscht"
    
    echo "📊 Backup-Statistiken:"
    ls -lh "${BACKUP_FILE}.gz"
else
    echo "❌ Backup fehlgeschlagen!"
    exit 1
fi

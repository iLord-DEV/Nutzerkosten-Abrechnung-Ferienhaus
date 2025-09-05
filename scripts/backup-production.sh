#!/bin/bash

# Production Backup Script für Cloudways
# Verwendung: ./scripts/backup-production.sh

# Konfiguration
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-nutzerkosten_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DB_NAME}_${DATE}.sql"

# Backup-Verzeichnis erstellen
mkdir -p "$BACKUP_DIR"

echo "🔄 Erstelle Backup der Datenbank: $DB_NAME"
echo "📅 Datum: $(date)"
echo "📁 Ziel: $BACKUP_DIR/$BACKUP_FILE"

# MySQL Dump erstellen
mysqldump -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" > "$BACKUP_DIR/$BACKUP_FILE"

# Prüfen ob Backup erfolgreich war
if [ $? -eq 0 ]; then
    echo "✅ Backup erfolgreich erstellt"
    
    # Backup komprimieren
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    echo "🗜️ Backup komprimiert: $BACKUP_DIR/$BACKUP_FILE.gz"
    
    # Alte Backups löschen (älter als 30 Tage)
    find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -mtime +30 -delete
    echo "🧹 Alte Backups gelöscht (älter als 30 Tage)"
    
    # Backup-Größe anzeigen
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE.gz" | cut -f1)
    echo "📊 Backup-Größe: $BACKUP_SIZE"
    
else
    echo "❌ Backup fehlgeschlagen!"
    exit 1
fi

echo "🎉 Backup-Prozess abgeschlossen"

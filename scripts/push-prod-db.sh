#!/bin/bash

# Production DB Push Script (GEFÄHRLICH!)
# Überschreibt die Production-Datenbank auf dem Pi mit lokalen Daten
#
# ⚠️  NUR IN NOTFÄLLEN VERWENDEN!
#
# Usage: npm run db:push:prod

set -e

echo "🔼 Production DB Push - Lokal → Raspberry Pi"
echo "=============================================="
echo ""
echo "⚠️⚠️⚠️  WARNUNG: GEFÄHRLICHE OPERATION!  ⚠️⚠️⚠️"
echo ""
echo "Dies überschreibt die PRODUCTION-Datenbank auf dem Pi"
echo "mit deinen LOKALEN Daten!"
echo ""
echo "Alle Daten die andere User auf dem Pi eingegeben haben"
echo "gehen VERLOREN!"
echo ""
echo "Nutze stattdessen normalerweise:"
echo "  - Daten direkt auf Pi eingeben (www.schloss-wuestenstein.de)"
echo "  - Oder 'npm run db:pull:prod' um Pi-Daten zu holen"
echo ""

# Erste Bestätigung
read -p "Bist du SICHER dass du fortfahren willst? (yes/NO) " -r
echo
if [[ ! $REPLY == "yes" ]]; then
    echo "Abgebrochen. (Musst 'yes' tippen, nicht 'y')"
    exit 0
fi

# Konfiguration laden
if [ ! -f .deploy-config ]; then
    echo "❌ .deploy-config nicht gefunden!"
    echo "Bitte erst ./deploy-to-pi.sh ausführen um Config zu erstellen."
    exit 1
fi

source .deploy-config

# Lokale DB-Config aus .env laden
if [ ! -f .env ]; then
    echo "❌ .env nicht gefunden!"
    exit 1
fi

# Extrahiere DB-Credentials aus DATABASE_URL
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"')
LOCAL_DB_USER=$(echo $DB_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
LOCAL_DB_PASS=$(echo $DB_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
LOCAL_DB_HOST=$(echo $DB_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
LOCAL_DB_PORT=$(echo $DB_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
LOCAL_DB_NAME=$(echo $DB_URL | sed -n 's|.*/\([^?]*\).*|\1|p')

echo ""
echo "📋 Konfiguration:"
echo "   Quelle (Lokal): $LOCAL_DB_USER@$LOCAL_DB_HOST:$LOCAL_DB_PORT/$LOCAL_DB_NAME"
echo "   Ziel (Pi):      $PI_USER@$PI_HOST:$PI_PORT"
echo ""

# Zweite Bestätigung
echo "⚠️  LETZTE WARNUNG!"
echo ""
read -p "Production-DB WIRKLICH überschreiben? Tippe 'ÜBERSCHREIBEN': " -r
echo
if [[ ! $REPLY == "ÜBERSCHREIBEN" ]]; then
    echo "Abgebrochen."
    exit 0
fi

# SSH-Verbindung prüfen
echo ""
echo "🔐 Prüfe SSH-Verbindung zu $PI_USER@$PI_HOST..."
if ! ssh -p $PI_PORT -o ConnectTimeout=5 $PI_USER@$PI_HOST "echo '✅ SSH-Verbindung erfolgreich'" 2>/dev/null; then
    echo "❌ SSH-Verbindung fehlgeschlagen!"
    exit 1
fi

# Backup-Verzeichnis erstellen
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +"%Y%m%d_%H%M%S")
LOCAL_DUMP="${BACKUP_DIR}/local-dump-${DATE}.sql"
PROD_BACKUP_DUMP="${BACKUP_DIR}/prod-backup-before-push-${DATE}.sql"

# Schritt 1: Production-Backup erstellen (WICHTIG!)
echo ""
echo "💾 Erstelle BACKUP der Production-DB (Sicherheit)..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose exec -T mysql sh -c \"mysqldump -u root -p\\\$MYSQL_ROOT_PASSWORD \\\$MYSQL_DATABASE\"" > "$PROD_BACKUP_DUMP"

if [ $? -eq 0 ]; then
    echo "✅ Production-Backup erstellt: $PROD_BACKUP_DUMP"
else
    echo "❌ Backup fehlgeschlagen! ABBRUCH aus Sicherheitsgründen!"
    exit 1
fi

# Schritt 2: Lokale DB dumpen
echo ""
echo "📤 Erstelle Dump der lokalen DB..."
if [ -z "$LOCAL_DB_PASS" ]; then
    mysqldump -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" "$LOCAL_DB_NAME" > "$LOCAL_DUMP"
else
    mysqldump -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASS" "$LOCAL_DB_NAME" > "$LOCAL_DUMP"
fi

if [ $? -eq 0 ]; then
    echo "✅ Lokaler Dump erstellt: $LOCAL_DUMP"
else
    echo "❌ Lokaler Dump fehlgeschlagen!"
    exit 1
fi

# Schritt 3: Dump zum Pi kopieren
echo ""
echo "📤 Kopiere Dump zum Pi..."
scp -P $PI_PORT "$LOCAL_DUMP" "$PI_USER@$PI_HOST:/tmp/local-dump.sql"

if [ $? -eq 0 ]; then
    echo "✅ Dump zum Pi kopiert"
else
    echo "❌ Kopieren fehlgeschlagen!"
    exit 1
fi

# Schritt 4: Production-DB überschreiben
echo ""
echo "⚠️  Überschreibe Production-DB..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose exec -T mysql sh -c \"mysql -u root -p\\\$MYSQL_ROOT_PASSWORD -e 'DROP DATABASE IF EXISTS \\\$MYSQL_DATABASE; CREATE DATABASE \\\$MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'\""

if [ $? -ne 0 ]; then
    echo "❌ Fehler beim Droppen der DB!"
    exit 1
fi

echo "📥 Importiere lokale Daten..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose exec -T mysql sh -c \"mysql -u root -p\\\$MYSQL_ROOT_PASSWORD \\\$MYSQL_DATABASE < /tmp/local-dump.sql\""

if [ $? -eq 0 ]; then
    echo "✅ Import erfolgreich!"
else
    echo "❌ Import fehlgeschlagen!"
    echo "❗ RESTORE AUS BACKUP: $PROD_BACKUP_DUMP"
    exit 1
fi

# Cleanup auf Pi
ssh -p $PI_PORT $PI_USER@$PI_HOST "rm -f /tmp/local-dump.sql"
echo "🗑️  Temp-Dateien auf Pi gelöscht"

echo ""
echo "✅ Lokale DB erfolgreich zu Production gepusht!"
echo ""
echo "📊 Production-Backup (für Rollback): $PROD_BACKUP_DUMP"
echo "📊 Lokaler Dump (Referenz): $LOCAL_DUMP"
echo ""
echo "🔄 App wird automatisch neu gestartet..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose restart app"

echo ""
echo "✅ Fertig!"
echo ""

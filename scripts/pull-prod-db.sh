#!/bin/bash

# Production DB Pull Script
# Holt die Production-Datenbank vom Pi und importiert sie lokal
#
# Usage: pnpm run db:pull:prod

set -e

echo "🔽 Production DB Pull - Raspberry Pi → Lokal"
echo "=============================================="
echo ""

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
# Format: mysql://user:password@host:port/database
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"')
LOCAL_DB_USER=$(echo $DB_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
LOCAL_DB_PASS=$(echo $DB_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
LOCAL_DB_HOST=$(echo $DB_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
LOCAL_DB_PORT=$(echo $DB_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
LOCAL_DB_NAME=$(echo $DB_URL | sed -n 's|.*/\([^?]*\).*|\1|p')

echo "📋 Konfiguration:"
echo "   Pi:    $PI_USER@$PI_HOST:$PI_PORT"
echo "   Lokal: $LOCAL_DB_USER@$LOCAL_DB_HOST:$LOCAL_DB_PORT/$LOCAL_DB_NAME"
echo ""

# SSH-Verbindung prüfen
echo "🔐 Prüfe SSH-Verbindung zu $PI_USER@$PI_HOST..."
if ! ssh -p $PI_PORT -o ConnectTimeout=5 $PI_USER@$PI_HOST "echo '✅ SSH-Verbindung erfolgreich'" 2>/dev/null; then
    echo "❌ SSH-Verbindung fehlgeschlagen!"
    exit 1
fi

# Backup-Verzeichnis erstellen
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +"%Y%m%d_%H%M%S")
TEMP_DUMP="/tmp/prod-dump-${DATE}.sql"
LOCAL_BACKUP="${BACKUP_DIR}/backup_local_before_pull_${DATE}.sql"

# Warnung
echo ""
echo "⚠️  WARNUNG: Dies überschreibt deine lokale Datenbank!"
echo ""
echo "📊 Aktuelle lokale Daten werden gesichert nach:"
echo "   $LOCAL_BACKUP"
echo ""
read -p "Fortfahren? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Abgebrochen."
    exit 0
fi

# Schritt 1: Lokales Backup erstellen
echo ""
echo "💾 Erstelle Backup der lokalen DB..."
if [ -z "$LOCAL_DB_PASS" ]; then
    mysqldump -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" "$LOCAL_DB_NAME" > "$LOCAL_BACKUP"
else
    mysqldump -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASS" "$LOCAL_DB_NAME" > "$LOCAL_BACKUP"
fi
echo "✅ Lokales Backup erstellt: $LOCAL_BACKUP"

# Schritt 2: Production DB vom Pi dumpen
echo ""
echo "📤 Hole Production-Datenbank vom Pi..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose exec -T mysql sh -c \"mysqldump -u root -p\\\$MYSQL_ROOT_PASSWORD \\\$MYSQL_DATABASE\"" > "$TEMP_DUMP"

if [ $? -eq 0 ]; then
    echo "✅ Production-Dump heruntergeladen: $TEMP_DUMP"
else
    echo "❌ Fehler beim Dump vom Pi!"
    exit 1
fi

# Schritt 3: Lokale DB droppen und neu erstellen
echo ""
echo "🗑️  Droppe lokale Datenbank..."
if [ -z "$LOCAL_DB_PASS" ]; then
    mysql -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" -e "DROP DATABASE IF EXISTS $LOCAL_DB_NAME; CREATE DATABASE $LOCAL_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
else
    mysql -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASS" -e "DROP DATABASE IF EXISTS $LOCAL_DB_NAME; CREATE DATABASE $LOCAL_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi
echo "✅ Datenbank neu erstellt"

# Schritt 4: Production-Dump importieren
echo ""
echo "📥 Importiere Production-Daten..."
if [ -z "$LOCAL_DB_PASS" ]; then
    mysql -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" "$LOCAL_DB_NAME" < "$TEMP_DUMP"
else
    mysql -h "$LOCAL_DB_HOST" -P "$LOCAL_DB_PORT" -u "$LOCAL_DB_USER" -p"$LOCAL_DB_PASS" "$LOCAL_DB_NAME" < "$TEMP_DUMP"
fi

if [ $? -eq 0 ]; then
    echo "✅ Import erfolgreich!"
else
    echo "❌ Import fehlgeschlagen!"
    echo "Restore aus Backup: mysql ... < $LOCAL_BACKUP"
    exit 1
fi

# Cleanup
rm -f "$TEMP_DUMP"
echo "🗑️  Temp-Dateien gelöscht"

# Prisma Client regenerieren (DB-Schema könnte sich geändert haben)
echo ""
echo "🔄 Regeneriere Prisma Client..."
pnpm exec prisma generate

echo ""
echo "✅ Production DB erfolgreich nach lokal synchronisiert!"
echo ""
echo "📊 Backup der alten lokalen Daten: $LOCAL_BACKUP"
echo ""

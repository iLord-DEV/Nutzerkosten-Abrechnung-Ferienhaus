#!/bin/bash

# Deploy Script für Raspberry Pi
# Kopiert lokale Dateien direkt per rsync auf den Pi und führt Docker-Deployment durch
#
# Usage:
#   ./deploy-to-pi.sh           # Normales Deployment (kein Seeding)
#   ./deploy-to-pi.sh --seed    # Mit Testdaten-Seeding

set -e

# Parameter parsen
SEED_DB=false
if [ "$1" = "--seed" ]; then
    SEED_DB=true
fi

echo "🚀 Nutzerkosten - Deploy to Raspberry Pi"
echo "=========================================="
if [ "$SEED_DB" = "true" ]; then
    echo "🌱 Seeding aktiviert (--seed Flag)"
else
    echo "📝 Seeding deaktiviert (nutze --seed zum Aktivieren)"
fi
echo ""

# Konfiguration laden
if [ ! -f .deploy-config ]; then
    echo "⚠️  .deploy-config nicht gefunden!"
    echo "Erstelle .deploy-config..."
    cat > .deploy-config << 'EOF'
# Raspberry Pi Deploy Konfiguration
PI_USER=pi
PI_HOST=heimserver.local
PI_PORT=22
PI_APP_DIR=/mnt/piStorage/docker/wuestenstein-nutzerkosten
EOF
    echo "✅ .deploy-config wurde erstellt."
    echo "📝 Bitte .deploy-config anpassen und erneut ausführen!"
    exit 1
fi

# Lade Konfiguration
source .deploy-config

echo ""
echo "📋 Deployment-Konfiguration:"
echo "   User:      $PI_USER"
echo "   Host:      $PI_HOST"
echo "   Port:      $PI_PORT"
echo "   App-Dir:   $PI_APP_DIR"
echo ""

# Prüfe SSH-Verbindung
echo "🔐 Prüfe SSH-Verbindung zu $PI_USER@$PI_HOST..."
if ! ssh -p $PI_PORT -o ConnectTimeout=5 $PI_USER@$PI_HOST "echo '✅ SSH-Verbindung erfolgreich'" 2>/dev/null; then
    echo "❌ SSH-Verbindung fehlgeschlagen!"
    echo "Prüfe:"
    echo "  - Ist der Pi erreichbar? (ping $PI_HOST)"
    echo "  - Stimmen User/Host/Port in .deploy-config?"
    echo "  - Ist SSH auf dem Pi aktiviert?"
    echo "  - Sind SSH-Keys eingerichtet? (ssh-copy-id $PI_USER@$PI_HOST)"
    exit 1
fi

# Prüfe ob rsync installiert ist
if ! command -v rsync &> /dev/null; then
    echo "❌ rsync ist nicht installiert!"
    echo "Installiere mit: brew install rsync"
    exit 1
fi

# Erstelle App-Verzeichnis auf dem Pi falls nicht vorhanden
echo ""
echo "📂 Erstelle App-Verzeichnis auf dem Pi..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "mkdir -p $PI_APP_DIR"

# Sync lokale Dateien zum Pi
echo ""
echo "📤 Kopiere Dateien zum Raspberry Pi..."
rsync -avz --delete \
    --progress \
    -e "ssh -p $PI_PORT" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.astro' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.env.docker' \
    --exclude '.env-example' \
    --exclude '.deploy-config' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    --exclude 'backups/*.sql' \
    ./ $PI_USER@$PI_HOST:$PI_APP_DIR/

echo "✅ Dateien erfolgreich kopiert!"

# Deployment auf Raspberry Pi ausführen
echo ""
echo "🔄 Starte Deployment auf Raspberry Pi..."
echo ""

echo "🛑 Stoppe Container..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose down"

echo "🏗️  Baue Images..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose build --no-cache"

echo "📦 Starte MySQL..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose up -d mysql"

echo "⏳ Warte auf MySQL (15 Sekunden)..."
sleep 15

echo "🔄 Migrationen..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose run -T --rm app npx prisma migrate deploy"

if [ "$SEED_DB" = "true" ]; then
    echo "🌱 Seeding..."
    if ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose run -T --rm app npm run db:seed"; then
        echo "✓ Seeding erfolgreich"
    else
        echo "⚠️ Seeding fehlgeschlagen (nicht kritisch, fahre fort)"
    fi
fi

echo "🚀 Starte App..."
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose up -d app"

echo "⏳ Warte auf App (10 Sekunden)..."
sleep 10

echo "📊 Container-Status:"
ssh -p $PI_PORT $PI_USER@$PI_HOST "cd $PI_APP_DIR && docker compose ps"

# Deployment erfolgreich
echo ""
echo "✅ Deployment auf Raspberry Pi erfolgreich abgeschlossen!"
echo ""
echo "🌐 Die App sollte jetzt erreichbar sein unter:"
echo "   http://$PI_HOST:3002"
echo ""
echo "📝 Nützliche Befehle:"
echo "   ssh $PI_USER@$PI_HOST \"cd $PI_APP_DIR && docker compose logs -f\""
echo "   ssh $PI_USER@$PI_HOST \"cd $PI_APP_DIR && docker compose ps\""
echo "   ssh $PI_USER@$PI_HOST \"cd $PI_APP_DIR && docker compose restart\""
echo ""

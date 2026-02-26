#!/bin/bash

# Nutzerkosten Docker Deployment Script
# Für manuelles Deployment direkt auf dem Raspberry Pi
#
# HINWEIS: Für automatisches Deployment vom Mac aus, verwende stattdessen:
#   ./deploy-to-pi.sh
#
# Dieses Script wird LOKAL auf dem Pi ausgeführt und bietet interaktive Optionen.

set -e

echo "🚀 Nutzerkosten Docker Deployment"
echo "=================================="

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo "⚠️  .env.docker nicht gefunden!"
    echo "Kopiere .env.docker.example zu .env.docker und passe die Werte an."
    cp .env.docker.example .env.docker
    echo "✅ .env.docker wurde erstellt. Bitte anpassen und erneut ausführen!"
    exit 1
fi

# Load environment variables
export $(cat .env.docker | grep -v '^#' | xargs)

echo ""
echo "📦 Baue Docker Images..."
docker compose build --no-cache

echo ""
echo "🗄️  Starte MySQL Container..."
docker compose up -d mysql

echo ""
echo "⏳ Warte auf MySQL..."
sleep 10

echo ""
echo "🔄 Führe Datenbank-Migrationen aus..."
docker compose run --rm app pnpm exec prisma migrate deploy

echo ""
echo "🌱 Möchtest du die Datenbank mit Testdaten füllen? (j/n)"
read -r SEED_DB
if [ "$SEED_DB" = "j" ] || [ "$SEED_DB" = "J" ]; then
    docker compose run --rm app pnpm run db:seed
    echo "✅ Datenbank wurde mit Testdaten gefüllt"
fi

echo ""
echo "🚀 Starte Anwendung..."
docker compose up -d app

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "📊 Status:"
docker compose ps

echo ""
echo "🌐 Die Anwendung läuft auf: http://localhost:3002"
echo ""
echo "📝 Nützliche Befehle:"
echo "  - Logs anzeigen:       docker compose logs -f"
echo "  - Status prüfen:       docker compose ps"
echo "  - Stoppen:             docker compose down"
echo "  - Neustart:            docker compose restart"
echo "  - Datenbank Backup:    docker exec wuestenstein-nutzerkosten-mysql mysqldump -u root -p\$MYSQL_ROOT_PASSWORD nutzerkosten_db > backup.sql"
echo ""

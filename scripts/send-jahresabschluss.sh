#!/bin/bash
#
# Jahresabschluss-Email Versand
#
# Sendet am 1. Februar automatisch die Jahresabschluss-Emails
# für das vergangene Jahr an alle User.
#
# VORAUSSETZUNG:
# - CRON_ADMIN_TOKEN muss in .env.docker auf dem Pi gesetzt sein
# - Das gleiche Token wird hier als Umgebungsvariable verwendet
#
# Installation (auf dem Pi):
# 1. Token in .env.docker setzen (falls noch nicht vorhanden):
#    openssl rand -hex 32
#    → In .env.docker als CRON_ADMIN_TOKEN eintragen
#
# 2. Dieses Script ausführbar machen:
#    chmod +x scripts/send-jahresabschluss.sh
#
# 3. Crontab editieren: crontab -e
#    Folgende Zeile hinzufügen:
#    0 9 1 2 * CRON_ADMIN_TOKEN="dein-token" /home/nutzerkosten/astro-app/scripts/send-jahresabschluss.sh >> /var/log/jahresabschluss.log 2>&1
#    (Sendet am 1. Februar um 9:00 Uhr)
#
# Manueller Test:
#   CRON_ADMIN_TOKEN="dein-token" ./scripts/send-jahresabschluss.sh --preview
#   CRON_ADMIN_TOKEN="dein-token" ./scripts/send-jahresabschluss.sh --test user@example.com
#

set -e

# Konfiguration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
APP_URL="${APP_URL:-http://localhost:3002}"
CRON_TOKEN="${CRON_ADMIN_TOKEN:-}"

# Token prüfen
if [ -z "$CRON_TOKEN" ]; then
    error_exit "CRON_ADMIN_TOKEN Umgebungsvariable nicht gesetzt!"
fi

# Jahr für den Abschluss (vergangenes Jahr)
YEAR=$(($(date +%Y) - 1))

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Fehlerbehandlung
error_exit() {
    log "FEHLER: $1"
    exit 1
}

# Hilfe anzeigen
show_help() {
    echo "Verwendung: $0 [OPTIONEN]"
    echo ""
    echo "Optionen:"
    echo "  --preview           Vorschau anzeigen (keine Emails)"
    echo "  --test EMAIL        Test-Email an angegebene Adresse senden"
    echo "  --year JAHR         Jahr für den Abschluss (Standard: letztes Jahr)"
    echo "  --url URL           App-URL (Standard: $APP_URL)"
    echo "  --help              Diese Hilfe anzeigen"
    echo ""
    echo "Beispiele:"
    echo "  $0                          # Emails für letztes Jahr versenden"
    echo "  $0 --preview                # Vorschau ohne Versand"
    echo "  $0 --test admin@example.com # Test-Email senden"
    echo "  $0 --year 2023              # Abschluss für 2023"
}

# Parameter parsen
PREVIEW_MODE=false
TEST_MODE=false
TEST_EMAIL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --preview)
            PREVIEW_MODE=true
            shift
            ;;
        --test)
            TEST_MODE=true
            TEST_EMAIL="$2"
            shift 2
            ;;
        --year)
            YEAR="$2"
            shift 2
            ;;
        --url)
            APP_URL="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            error_exit "Unbekannte Option: $1"
            ;;
    esac
done

log "=== Jahresabschluss-Email Versand ==="
log "Jahr: $YEAR"
log "App-URL: $APP_URL"

# Vorschau-Modus
if [ "$PREVIEW_MODE" = true ]; then
    log "Modus: Vorschau"

    response=$(curl -s -X GET "${APP_URL}/api/admin/send-jahresabschluss?jahr=${YEAR}" \
        -H "Content-Type: application/json" \
        -H "X-Cron-Token: ${CRON_TOKEN}")

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    exit 0
fi

# Test-Modus
if [ "$TEST_MODE" = true ]; then
    if [ -z "$TEST_EMAIL" ]; then
        error_exit "Test-Email-Adresse erforderlich"
    fi

    log "Modus: Test an $TEST_EMAIL"

    response=$(curl -s -X POST "${APP_URL}/api/admin/send-jahresabschluss" \
        -H "Content-Type: application/json" \
        -H "X-Cron-Token: ${CRON_TOKEN}" \
        -d "{\"jahr\": ${YEAR}, \"testMode\": true, \"testEmail\": \"${TEST_EMAIL}\"}")

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    exit 0
fi

# Produktions-Versand
log "Modus: Produktion - Emails werden versendet!"

response=$(curl -s -X POST "${APP_URL}/api/admin/send-jahresabschluss" \
    -H "Content-Type: application/json" \
    -H "X-Cron-Token: ${CRON_TOKEN}" \
    -d "{\"jahr\": ${YEAR}}")

echo "$response" | jq '.' 2>/dev/null || echo "$response"

# Erfolgsprüfung
if echo "$response" | grep -q '"gesendet"'; then
    gesendet=$(echo "$response" | jq -r '.gesendet' 2>/dev/null || echo "?")
    log "Erfolgreich: $gesendet Emails versendet"
else
    log "WARNUNG: Unerwartete Antwort vom Server"
    exit 1
fi

log "=== Fertig ==="

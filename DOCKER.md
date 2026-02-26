# Docker Deployment Guide

Diese Anleitung beschreibt, wie du die Nutzerkosten-App auf einem Raspberry Pi mit Docker deployen kannst.

## Workflow: Lokale Entwicklung + Remote Deployment

**Empfohlener Workflow:**

1. **Lokal entwickeln** mit Hot Module Reloading (HMR) und lokaler Datenbank
   ```bash
   pnpm dev  # Läuft auf http://localhost:4321
   ```

2. **Auf Raspberry Pi deployen** mit einem Befehl
   ```bash
   ./deploy-to-pi.sh
   ```

Das Deploy-Script übernimmt automatisch:
- ✅ Kopiert lokale Dateien per rsync auf den Pi
- ✅ SSH-Verbindung zum Raspberry Pi
- ✅ Docker Images neu bauen
- ✅ Datenbank-Migrationen ausführen
- ✅ Container neu starten

**Wichtig:**
- Docker wird **nur auf dem Raspberry Pi** verwendet, nicht für die lokale Entwicklung!
- **Kein Git nötig** - lokale Dateien werden direkt per rsync kopiert
- Du kannst lokal normal entwickeln, committen ist optional

---

## Voraussetzungen

- **Raspberry Pi** (3B+ oder neuer, empfohlen: Pi 4 mit 4GB+ RAM)
- **Docker** und **Docker Compose** installiert
- Mindestens **8GB** freier Speicherplatz
- **Port 3002** verfügbar

## Installation von Docker auf Raspberry Pi

Falls Docker noch nicht installiert ist:

```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# User zur Docker-Gruppe hinzufügen
sudo usermod -aG docker $USER

# Docker Compose installieren
sudo apt-get install -y docker compose

# Neustart für Gruppenrechte
sudo reboot
```

## Remote Deployment (von deinem Entwicklungs-Mac zum Pi)

### Einmalige Einrichtung

**Auf deinem Entwicklungs-Mac:**

1. **Deploy-Konfiguration erstellen:**
   ```bash
   cp .deploy-config.example .deploy-config
   nano .deploy-config
   ```

2. **SSH-Konfiguration anpassen:**
   ```bash
   # In .deploy-config:
   PI_USER=pi                                              # Dein Pi-Username
   PI_HOST=heimserver.local                                # Hostname deines Pi
   PI_PORT=22                                              # SSH-Port
   PI_APP_DIR=/mnt/piStorage/docker/wuestenstein-nutzerkosten  # App-Verzeichnis auf dem Pi
   ```

3. **SSH-Keys einrichten** (nur einmal nötig):
   ```bash
   ssh-copy-id pi@heimserver.local
   # Danach kannst du dich ohne Passwort einloggen
   ```

4. **rsync installieren** (falls nicht vorhanden):
   ```bash
   brew install rsync
   ```

**Auf dem Raspberry Pi:**

1. **Docker installieren** (siehe "Installation von Docker" oben)

2. **Beim ersten Deployment:**
   - Das App-Verzeichnis wird automatisch vom Deploy-Script erstellt
   - `.env.docker.example` wird mit kopiert und kann als Vorlage verwendet werden
   - Falls `.env.docker` fehlt, stoppt das Script und fordert dich auf, die Passwörter zu setzen

3. **Umgebungsvariablen konfigurieren** (nur beim ersten Mal):
   ```bash
   # SSH zum Pi
   ssh pi@heimserver.local
   cd /mnt/piStorage/docker/wuestenstein-nutzerkosten
   nano .env.docker
   # Setze sichere Passwörter!
   ```

### Deployment durchführen

**Einfaches Deployment von deinem Mac:**

```bash
./deploy-to-pi.sh
```

Das wars! Das Script:
- Kopiert lokale Dateien per rsync zum Pi (kein Git nötig!)
- Verbindet sich per SSH zum Pi
- Prüft ob `.env.docker` existiert
- Baut Docker-Images neu
- Führt Migrations aus
- Startet die Container neu
- Zeigt Status und Logs

### Troubleshooting Deploy-Script

**SSH-Verbindung fehlgeschlagen:**
```bash
# Teste SSH-Verbindung manuell
ssh pi@heimserver.local

# Prüfe ob Pi erreichbar ist
ping heimserver.local

# SSH-Keys neu einrichten
ssh-copy-id -i ~/.ssh/id_rsa.pub pi@heimserver.local
```

**rsync-Fehler:**
```bash
# Prüfe ob rsync auf dem Mac installiert ist
which rsync

# Falls nicht installiert
brew install rsync
```

**Dateien werden nicht synchronisiert:**
```bash
# Teste rsync manuell
rsync -avz --dry-run --progress ./ pi@heimserver.local:/mnt/piStorage/docker/wuestenstein-nutzerkosten/

# --dry-run zeigt was kopiert würde, ohne tatsächlich zu kopieren
```

---

## Manuelles Deployment (direkt auf dem Pi)

Falls du das Deployment lieber manuell auf dem Pi durchführen möchtest:

### 1. Repository klonen

```bash
git clone <repository-url>
cd astro-app
```

### 2. Umgebungsvariablen konfigurieren

```bash
# .env.docker erstellen
cp .env.docker.example .env.docker

# Bearbeiten und sichere Passwörter setzen
nano .env.docker
```

**Wichtig:** Ändere alle Passwörter in `.env.docker`!

```env
MYSQL_ROOT_PASSWORD=dein_sicheres_root_passwort
MYSQL_PASSWORD=dein_sicheres_user_passwort
```

### 3. Deployment ausführen

**Option A: Automatisches Deployment (empfohlen)**

```bash
./docker-deploy.sh
```

**Option B: Manuelles Deployment**

```bash
# Images bauen
docker compose build

# MySQL starten
docker compose up -d mysql

# Warten auf MySQL (10-15 Sekunden)
sleep 10

# Datenbank-Migrationen
docker compose run --rm app pnpm exec prisma migrate deploy

# Optional: Testdaten einfügen
docker compose run --rm app pnpm run db:seed

# Anwendung starten
docker compose up -d app
```

### 4. Deployment überprüfen

```bash
# Status prüfen
docker compose ps

# Logs anzeigen
docker compose logs -f

# Nur App-Logs
docker compose logs -f app
```

Die App sollte nun auf **http://raspberry-pi-ip:3002** erreichbar sein.

## Wichtige Befehle

### Container-Verwaltung

```bash
# Alle Container starten
docker compose up -d

# Alle Container stoppen
docker compose down

# Container neustarten
docker compose restart

# Container mit neuem Build
docker compose up -d --build
```

### Logs & Debugging

```bash
# Alle Logs anzeigen
docker compose logs -f

# Nur App-Logs
docker compose logs -f app

# Nur MySQL-Logs
docker compose logs -f mysql

# Letzte 100 Zeilen
docker compose logs --tail=100
```

### Datenbank-Verwaltung

```bash
# Prisma Studio (GUI)
docker compose exec app pnpm exec prisma studio

# Datenbank-Backup
docker exec wuestenstein-nutzerkosten-mysql mysqldump \
  -u root -p${MYSQL_ROOT_PASSWORD} \
  nutzerkosten_db > backup_$(date +%Y%m%d).sql

# Datenbank wiederherstellen
docker exec -i wuestenstein-nutzerkosten-mysql mysql \
  -u root -p${MYSQL_ROOT_PASSWORD} \
  nutzerkosten_db < backup.sql

# Migrations neu ausführen
docker compose run --rm app pnpm exec prisma migrate deploy

# Prisma Client regenerieren
docker compose run --rm app pnpm exec prisma generate
```

### Updates deployen

```bash
# Code aktualisieren
git pull

# Container neu bauen und starten
docker compose up -d --build

# Migrations ausführen
docker compose run --rm app pnpm exec prisma migrate deploy
```

## Ressourcen-Limits

Für Raspberry Pi empfohlene Anpassungen in `docker compose.yml`:

```yaml
services:
  mysql:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  app:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## Auto-Start beim Booten

```bash
# Docker beim Systemstart aktivieren
sudo systemctl enable docker

# Container automatisch starten
# (restart: unless-stopped ist bereits in docker compose.yml gesetzt)
```

## Troubleshooting

### Container startet nicht

```bash
# Logs prüfen
docker compose logs app

# Container manuell starten mit Debug-Output
docker compose up app
```

### MySQL-Verbindungsfehler

```bash
# MySQL-Status prüfen
docker compose logs mysql

# MySQL neu starten
docker compose restart mysql

# Warten bis MySQL bereit ist
docker compose exec mysql mysqladmin ping -h localhost -u root -p
```

### Speicherprobleme auf Raspberry Pi

```bash
# Nicht verwendete Images löschen
docker image prune -a

# Alle nicht verwendeten Ressourcen löschen
docker system prune -a --volumes
```

### Port 3002 bereits belegt

```bash
# Port-Verwendung prüfen
sudo netstat -tulpn | grep 3002

# Oder Port in docker compose.yml ändern:
ports:
  - "3003:3002"  # Host:Container
```

## Netzwerk-Zugriff von außen

### Lokales Netzwerk

Die App ist standardmäßig auf Port 3002 im lokalen Netzwerk erreichbar.

```bash
# Raspberry Pi IP-Adresse finden
hostname -I
```

Dann im Browser: `http://<raspberry-pi-ip>:3002`

### Reverse Proxy (Nginx/Caddy)

Für HTTPS und Domain-Namen kannst du einen Reverse Proxy einrichten:

**Nginx-Beispiel:**

```nginx
server {
    listen 80;
    server_name nutzerkosten.example.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Sicherheit

- ✅ Ändere alle Standard-Passwörter in `.env.docker`
- ✅ Verwende starke Passwörter (min. 16 Zeichen)
- ✅ Setze `NODE_ENV=production`
- ✅ Limitiere Netzwerk-Zugriff über Firewall
- ✅ Erstelle regelmäßige Datenbank-Backups
- ✅ Halte Docker und System aktuell

## Performance-Optimierung für Raspberry Pi

1. **Swap erhöhen** (bei wenig RAM):
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

2. **Logs limitieren**:
```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Weitere Hilfe

- **Astro Docs:** https://docs.astro.build
- **Prisma Docs:** https://www.prisma.io/docs
- **Docker Docs:** https://docs.docker.com
- **Projekt CLAUDE.md:** Siehe Projektdokumentation

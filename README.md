# Nutzerkosten-Abrechnung für Wohngemeinschaften

Eine moderne Web-Anwendung zur Verwaltung und Abrechnung von Nutzerkosten in Wohngemeinschaften, entwickelt mit Astro, Prisma und MySQL.

## 🚀 Features

### Benutzerverwaltung
- **Sichere Passwort-Authentifizierung** mit bcrypt-Hashing
- **Rollenbasierte Berechtigung** (Admin/Benutzer)
- **Starke Passwort-Validierung** (8+ Zeichen, Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen)
- **Passwort-Änderung** für Admins und Benutzer
- **Session-Management** mit sicheren Cookies

### Aufenthaltsverwaltung
- **Aufenthalte erfassen** mit Ankunft/Abreise
- **Zählerstände** für Ölverbrauch
- **Übernachtungen** für Mitglieder und Gäste
- **Automatische Kostenberechnung**

### Tankfüllungen & Zähler
- **Tankfüllungen verwalten** mit Preisen und Zählerständen
- **Zählerverwaltung** mit Ein-/Ausbau
- **Verbrauchsberechnung** pro Stunde

### Terminplanung
- **Termine planen** mit Abstimmungen
- **Kommentar-System** für Diskussionen
- **Änderungshistorie** mit Versionskontrolle

### Statistiken & Berichte
- **Persönliche Dashboards** für jeden Benutzer
- **Admin-Dashboard** mit Übersichten
- **Kostenstatistiken** und Charts
- **Jahresabschlüsse**

## 🛠️ Technologie-Stack

- **Frontend**: Astro 5, Tailwind CSS 4, Vue 3
- **Backend**: Astro API Routes
- **Datenbank**: MySQL mit Prisma ORM
- **Authentifizierung**: bcrypt für Passwort-Hashing, Session-basierte Auth
- **Charts**: Chart.js mit Vue-ChartJS

## 📋 Voraussetzungen

- Node.js 18+ 
- MySQL 8.0+
- npm oder yarn

## 🚀 Installation

1. **Repository klonen**

   **Mit HTTPS (empfohlen für alle Benutzer):**
   ```bash
   git clone https://github.com/iLord-DEV/Nutzerkosten-Abrechnung-Ferienhaus.git
   cd Nutzerkosten-Abrechnung-Ferienhaus
   ```

   **Oder mit SSH (für Entwickler mit SSH-Keys):**
   ```bash
   git clone git@github.com:iLord-DEV/Nutzerkosten-Abrechnung-Ferienhaus.git
   cd Nutzerkosten-Abrechnung-Ferienhaus
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren**
   ```bash
   cp .env-example .env
   # .env bearbeiten und Datenbank-URL anpassen
   ```

4. **Datenbank einrichten**
   ```bash
   # MySQL-Datenbank erstellen
   mysql -u root -p
   CREATE DATABASE nutzerkosten_db;
   
   # Prisma-Migrationen ausführen
   npx prisma migrate dev
   
   # Testdaten laden (optional)
   npm run db:seed
   ```

5. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

## 🔐 Authentifizierung

Die App verwendet eine **sichere Passwort-basierte Authentifizierung**:

- **Passwort-Hashing** mit bcrypt
- **Starke Passwort-Validierung** (8+ Zeichen, Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen)
- **Rollenbasierte Berechtigung** (Admin/Benutzer)
- **Passwort-Änderung** für alle Benutzer möglich

### Erste Einrichtung
Nach dem ersten Setup müssen alle Benutzer ihre Passwörter ändern. Die App leitet neue Benutzer automatisch zur Passwort-Änderung weiter.

⚠️ **Sicherheit**: Verwende starke, einzigartige Passwörter!

## 📊 Datenbank-Backup

### Backup erstellen
```bash
npm run db:backup
```

### Backup wiederherstellen
```bash
gunzip -c backups/backup_nutzerkosten_db_YYYYMMDD_HHMMSS.sql.gz | mysql -u root -p nutzerkosten_db
```

Siehe [BACKUP.md](./BACKUP.md) für detaillierte Anweisungen.

## 🏗️ Projekt-Struktur

```
src/
├── layouts/           # Astro-Layouts
├── pages/            # Seiten und API-Routes
│   ├── api/          # Backend-API
│   ├── admin/        # Admin-Bereich
│   ├── aufenthalte/  # Aufenthaltsverwaltung
│   ├── profil/       # Benutzer-Profil
│   └── ...
├── utils/            # Utility-Funktionen
│   ├── auth.ts       # Authentifizierung
│   └── passwordValidation.ts
└── styles/           # CSS-Styles

prisma/
├── schema.prisma     # Datenbankschema
├── migrations/       # Datenbank-Migrationen
└── seed.ts          # Testdaten

scripts/
└── backup-database.sh # Backup-Skript
```

## 🔧 Entwicklung

### Verfügbare Skripte
- `npm run dev` - Entwicklungsserver
- `npm run build` - Produktions-Build
- `npm run preview` - Build-Vorschau
- `npm run db:seed` - Testdaten laden
- `npm run db:backup` - Datenbank-Backup (lokal)
- `npm run db:backup:prod` - Produktions-Backup
- `npm run pm2:start` - App mit PM2 starten
- `npm run pm2:stop` - App mit PM2 stoppen
- `npm run pm2:restart` - App mit PM2 neustarten
- `npm run pm2:logs` - PM2-Logs anzeigen

### Datenbank-Migrationen
```bash
# Neue Migration erstellen
npx prisma migrate dev --name migration_name

# Schema synchronisieren
npx prisma db push

# Prisma Client generieren
npx prisma generate
```

## 🚀 Deployment

### Lokale Entwicklung
```bash
npm run dev
```

### Produktions-Build
```bash
npm run build
npm run preview
```

## ☁️ Uberspace Deployment (Empfohlen)

**Uberspace ist die beste Option für deine Astro-App:**
- ✅ **Node.js 18+** bereits installiert
- ✅ **MySQL-Datenbank** inklusive
- ✅ **PM2** bereits verfügbar
- ✅ **Günstiger** (ab 5€/Monat)
- ✅ **Deutsche Firma** (Datenschutz)
- ✅ **SSH-Zugang** für volle Kontrolle
- ✅ **Einfaches Deployment** - alles vorinstalliert

#### Voraussetzungen
- Uberspace Account
- Domain oder Subdomain
- SSH-Zugang

#### 1. Server vorbereiten
```bash
# Node.js ist bereits installiert (verschiedene Versionen verfügbar)
node --version

# PM2 ist bereits installiert und verfügbar
pm2 --version

# Git ist bereits verfügbar
git --version
```

#### 2. Projekt deployen
```bash
# Repository klonen
git clone https://github.com/iLord-DEV/Nutzerkosten-Abrechnung-Ferienhaus.git
cd Nutzerkosten-Abrechnung-Ferienhaus

# Dependencies installieren
npm ci --production

# Build erstellen
npm run build

# Prisma Client generieren
npx prisma generate

# Datenbank migrieren
npx prisma migrate deploy
```

### 3. Umgebungsvariablen konfigurieren
```bash
# .env Datei erstellen
nano .env
```

```env
# .env für Production
DATABASE_URL="mysql://username:password@your-cloudways-mysql-host:3306/database_name"
NODE_ENV="production"
```

### 4. PM2 Konfiguration
```bash
# ecosystem.config.js erstellen
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'astro-app',
    script: 'npm',
    args: 'run preview',
    cwd: '/path/to/your/astro-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4321
    }
  }]
}
```

### 5. App starten
```bash
# Mit PM2 starten
pm2 start ecosystem.config.js

# PM2 beim Boot starten
pm2 startup
pm2 save

# Status prüfen
pm2 status
pm2 logs astro-app
```

### 6. Nginx Konfiguration (Cloudways)
```nginx
# In Cloudways Panel: Nginx Settings
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7. SSL-Zertifikat (Cloudways)
- Im Cloudways Panel: SSL Certificate hinzufügen
- Let's Encrypt oder eigenes Zertifikat verwenden

### 8. Datenbank-Backup einrichten
```bash
# Backup-Script erstellen
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h your-mysql-host -u username -p database_name > backup_$DATE.sql
gzip backup_$DATE.sql
```

```bash
# Cron-Job für tägliche Backups
crontab -e
# Füge hinzu: 0 2 * * * /path/to/backup.sh
```

### 9. Monitoring & Wartung
```bash
# App-Logs anzeigen
pm2 logs astro-app --lines 100

# App neustarten
pm2 restart astro-app

# App stoppen
pm2 stop astro-app

# App-Status
pm2 status
pm2 monit
```

### 10. Updates deployen
```bash
# Code aktualisieren
git pull origin main

# Dependencies aktualisieren
npm ci --production

# Neuen Build erstellen
npm run build

# Prisma Client aktualisieren
npx prisma generate

# Datenbank-Migrationen ausführen
npx prisma migrate deploy

# App neustarten
pm2 restart astro-app
```

### Troubleshooting
```bash
# Port prüfen
netstat -tlnp | grep :4321

# Prozesse anzeigen
ps aux | grep node

# Nginx-Status
sudo systemctl status nginx

# MySQL-Verbindung testen
mysql -h your-mysql-host -u username -p
```

## 📝 Lizenz

Dieses Projekt ist für den privaten Gebrauch bestimmt.

## 🤝 Beitragen

Bei Fragen oder Problemen erstelle ein Issue oder kontaktiere den Entwickler.

---

## ☕ Support

Wenn dir dieses Projekt gefällt und du den Entwickler unterstützen möchtest:

<a href="https://www.buymeacoffee.com/Christoph.Heim" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

**Entwickelt mit ❤️ und Spaß an der Sache**
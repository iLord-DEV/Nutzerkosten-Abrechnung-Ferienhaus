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

# Git ist bereits verfügbar
git --version
```

#### 2. Projekt deployen
```bash
# In html-Verzeichnis wechseln
cd ~/html

# Repository klonen
git clone https://github.com/iLord-DEV/Nutzerkosten-Abrechnung-Ferienhaus.git
cd Nutzerkosten-Abrechnung-Ferienhaus

# Dependencies installieren (mit --legacy-peer-deps wegen Tailwind CSS 4.x)
npm install --legacy-peer-deps

# Build erstellen
npm run build

# Prisma Client generieren
npx prisma generate

# Datenbank migrieren
npx prisma migrate deploy
```

**Wichtige Hinweise:**
- ✅ **Node.js-Adapter** ist bereits in der Konfiguration enthalten
- ✅ **`--legacy-peer-deps`** nötig wegen Tailwind CSS 4.x Konflikt
- ✅ **Server-Mode** aktiviert für API-Routes

### 3. MySQL-Datenbank einrichten
```bash
# Zusätzliche Datenbank erstellen (mit Username-Präfix)
mysql -e "CREATE DATABASE username_nutzerkosten"

# Passwort anzeigen (aus ~/.my.cnf)
my_print_defaults client
```

### 4. Umgebungsvariablen konfigurieren
```bash
# .env Datei erstellen
nano .env
```

```env
# .env für Uberspace (Username = dein Uberspace-Username)
DATABASE_URL="mysql://username:password@localhost:3306/username_nutzerkosten"
NODE_ENV="production"
```

**Wichtige Uberspace-Details:**
- ✅ **Datenbank-Name**: `username_*` (mit deinem Username als Präfix)
- ✅ **Username**: Dein Uberspace-Username
- ✅ **Passwort**: Aus `~/.my.cnf` (automatisch generiert)
- ✅ **Host**: `localhost` (lokale Verbindung)
- ✅ **Port**: `3306` (Standard MySQL)

### 5. App starten
```bash
# App starten (Uberspace verwaltet den Prozess automatisch)
npm start
```


### 6. Web-Backend konfigurieren
```bash
# Node.js-Backend auf Port 3000 setzen
uberspace web backend set / --http --port 3000

# Domain hinzufügen (optional)
uberspace-add-domain -d deine-domain.com
```

**Wichtige Uberspace-Details:**
- ✅ **HOST=0.0.0.0** nötig für externe Verbindungen
- ✅ **PORT=3000** selbst definiert. s.o.
- ✅ **Backend-Konfiguration** statt Webroot
- ✅ **Automatische Prozessverwaltung** - Uberspace verwaltet den Prozess

### 7. SSL-Zertifikat
```bash
# Let's Encrypt SSL
uberspace-add-certificate -d deine-domain.com
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
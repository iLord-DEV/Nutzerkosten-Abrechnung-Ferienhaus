# Nutzerkosten-Abrechnung für Wohngemeinschaften

Eine moderne Web-Anwendung zur Verwaltung und Abrechnung von Nutzerkosten in Wohngemeinschaften, entwickelt mit Astro, Prisma und MySQL.

## 🚀 Features

### Benutzerverwaltung
- **Sichere Authentifizierung** mit Passwort-basierter Anmeldung
- **Rollenbasierte Berechtigung** (Admin/Benutzer)
- **Passwort-Sicherheit** mit starker Validierung (8+ Zeichen, Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen)
- **Passwort-Änderung** für Admins und Benutzer

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
- **Authentifizierung**: bcrypt für Passwort-Hashing
- **Charts**: Chart.js mit Vue-ChartJS

## 📋 Voraussetzungen

- Node.js 18+ 
- MySQL 8.0+
- npm oder yarn

## 🚀 Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd astro-app
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

## 🔐 Standard-Anmeldedaten

Nach dem ersten Setup haben alle Benutzer das Passwort `1234`:

- **Admin**: post@christoph-heim.de
- **Benutzer**: usheim@t-online.de, markus.wilson-zwilling@gmx.de, etc.

⚠️ **Wichtig**: Ändere alle Passwörter nach dem ersten Login!

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
- `npm run db:backup` - Datenbank-Backup

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

1. **Produktions-Build**
   ```bash
   npm run build
   ```

2. **Umgebungsvariablen** für Produktion konfigurieren
3. **Datenbank** für Produktion einrichten
4. **Webserver** (z.B. Nginx) konfigurieren

## 📝 Lizenz

Dieses Projekt ist für den privaten Gebrauch bestimmt.

## 🤝 Beitragen

Bei Fragen oder Problemen erstelle ein Issue oder kontaktiere den Entwickler.

---

**Entwickelt mit ❤️ für Wohngemeinschaften**
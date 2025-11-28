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

### 🤖 KI-Chatbot (Claude AI)

Ein intelligenter Assistent für das Ferienhaus, erreichbar unter `/chat`.

#### Funktionen für alle User:

| Funktion | Beispiel |
|----------|----------|
| **Aufenthalt erstellen** | "Erstelle einen Aufenthalt vom 1.-5. Dezember, Zähler 450-460, 4 Nächte" |
| **Aufenthalte abfragen** | "Zeig mir meine Aufenthalte" oder "Was waren meine Aufenthalte 2024?" |
| **Statistiken** | "Wie viele Heizstunden hatte ich?" oder "Was ist der aktuelle Zählerstand?" |
| **Wissen abfragen** | "Wie ist das WLAN-Passwort?" oder "Wie bediene ich die Heizung?" |

#### Zusätzliche Admin-Funktionen:

| Funktion | Beispiel |
|----------|----------|
| **Wissen speichern** | "Speichere unter Küche: Die Spülmaschine ist eine Miele G7000" |
| **Wissen auflisten** | "Zeig mir alle Einträge in der Wissensdatenbank" |
| **Wissen löschen** | "Lösche den Eintrag mit ID 5" |

#### Wissensdatenbank verwalten (`/admin/wissensdatenbank`):

- **Manuell**: Einträge über Web-Formular erstellen/bearbeiten
- **Datei-Upload**: PDF, Markdown oder TXT hochladen (Text wird automatisch extrahiert)
- **Per Chat**: Als Admin direkt im Chat Wissen speichern lassen

#### Konfiguration:

```env
# .env
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

API-Key von [console.anthropic.com](https://console.anthropic.com/)

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
npm start
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
- ✅ **Port 4321** als Standard für Uberspace

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

### 5. Web-Backend konfigurieren
```bash
# Node.js-Backend auf Port 4321 setzen (Astro Standard-Port)
uberspace web backend set / --http --port 4321

# Domain hinzufügen (optional)
uberspace-add-domain -d deine-domain.com
```

### 6. App starten (mit Screen für dauerhaften Betrieb)
```bash
# Screen starten
screen -S nutzerkosten

# App starten
npm start

# Screen verlassen (Strg+A, dann D)
# App läuft weiter, auch wenn Terminal geschlossen wird
```

**Screen-Befehle:**
```bash
# Zurück zu Screen
screen -r nutzerkosten

# Screen-Status prüfen
screen -ls

# Screen beenden (wenn App gestoppt werden soll)
screen -S nutzerkosten -X quit
```

**Wichtige Uberspace-Details:**
- ✅ **HOST=0.0.0.0** nötig für externe Verbindungen
- ✅ **PORT=4321** Astro Standard-Port
- ✅ **Backend-Konfiguration** statt Webroot
- ✅ **Screen für Prozessverwaltung**

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

---

## 📌 TODO

### Offene Aufgaben

---

### 1. Login-Optionen erweitern

**Ziel:** Login mit E-Mail ODER Username ODER Vorname.Nachname ermöglichen

**Technische Details:**
- **Dateien:** `src/pages/api/auth/login.ts`, `src/pages/login.astro`
- **Logik:** Automatische Erkennung des Input-Formats
  - E-Mail (enthält `@`)
  - Vorname.Nachname (enthält `.`)
  - Sonst: Username
- **Case-insensitive** Vergleich für alle Varianten
- **Prisma Query:** `OR`-Bedingung für flexible Suche

**UI-Änderungen:**
- Placeholder: "E-Mail, Username oder Vorname.Nachname"
- Hilfetext unter Input-Feld

**Priorität:** HOCH (schnell, low-risk)

---

### 2. E-Mail-Benachrichtigung bei Jahresabschluss

**Ziel:** Automatische E-Mail am 1. Februar an alle User mit Jahreskosten

**Technische Implementation:**

**Neue Dependencies:**
```bash
npm install nodemailer @types/nodemailer node-cron
```

**Neue Dateien:**
- `src/utils/email.ts` - SMTP-Setup mit nodemailer
- `src/utils/emailTemplates.ts` - HTML-Template für Jahresabschluss-E-Mail
- `src/pages/api/admin/jahresabschluss-email.ts` - Manueller Versand-Trigger (Admin-Button)
- `scripts/cron-jahresabschluss.ts` - Automatischer Cron-Job

**Cron-Konfiguration:**
- Läuft täglich um 8:00 Uhr
- Prüft: Ist heute der 1. Februar?
- Lädt alle User mit Aufenthalten im Vorjahr
- Versendet E-Mails nacheinander

**ENV-Variablen (.env):**
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=dein-email@example.com
SMTP_PASS=dein-passwort
```

**E-Mail-Inhalt:**
- Betreff: "Jahresabschluss {Jahr} - Deine Kosten"
- HTML-Template mit:
  - Gesamtkosten (Öl + Übernachtungen)
  - Tabelle aller Aufenthalte (Datum, Tage, Kosten)
  - Link zur detaillierten Statistik-Seite
  - Zahlungsinformationen

**Datenquelle:**
- API `/api/statistiken` liefert bereits alle benötigten Daten
- Aufenthalte, Kostenaufschlüsselung, Jahressumme

**Docker-Integration:**
- Cron-Job läuft im Container (node-cron)
- ODER: Zusätzlicher Admin-Button für manuellen Versand

**Priorität:** MITTEL

---

### 3. User-Authentifizierung für Production

**Ziel:** Produktions-taugliche Auth-Konfiguration mit erhöhter Sicherheit

**Änderungen:**

**Cookie-Sicherheit (`src/utils/auth.ts`):**
```typescript
context.cookies.set('session', sessionData, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  sameSite: 'strict',                           // CSRF-Schutz
  path: '/',
  maxAge: 60 * 60 * 24 * 7,                     // 7 Tage
  signed: true                                   // Cookie-Signing
});
```

**ENV-Variablen (.env):**
```env
NODE_ENV=production
SESSION_SECRET=generiere-einen-sicheren-random-string
```

**Optional: Rate Limiting**
- Neue Datei: `src/middleware/rateLimit.ts`
- Max 5 Login-Versuche pro IP/15min
- In-Memory-Store (oder Redis falls gewünscht)
- Blockiert Brute-Force-Angriffe

**Security Headers (optional):**
```typescript
// astro.config.mjs
export default {
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
}
```

**Priorität:** HOCH (vor Production-Deploy!)

---

### 4. Terminverwaltung ausarbeiten

**Ziel:** Kalender-Ansicht, iCal-Abonnement, UI-Verbesserungen

#### A) Kalender-Ansicht

**Neue Seite:** `src/pages/terminplanung/index.astro`

**Dependencies:**
```bash
npm install @fullcalendar/core @fullcalendar/daygrid
```

**Features:**
- Visuelle Monatsansicht aller Termine
- Farbcodierung nach Status:
  - PENDING: Orange
  - APPROVED: Grün
  - DISCUSSING: Blau
  - CANCELLED: Grau
- Click auf Termin → Detail-Seite
- Filter nach Status
- Navigation: Prev/Next Monat

**Technische Integration:**
- FullCalendar Vue-Komponente
- Lädt Termine via `/api/terminplanung`
- Responsive Design mit DaisyUI

#### B) iCal-Abonnement (Auto-generierte Tokens)

**Prisma Schema-Änderung:**
```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  name         String
  icalToken    String   @unique @default(uuid())  // NEU!
  // ... rest
}
```

**Migration erstellen:**
```bash
npx prisma migrate dev --name add_ical_token_to_user
```

**Neue API:**
- `GET /api/terminplanung/ical/feed?token=xyz` - iCal-Feed (öffentlich mit Token-Auth)
- `POST /api/profil/ical-token/regenerate` - Token neu generieren (falls kompromittiert)

**Dependencies:**
```bash
npm install ical-generator
```

**UI-Erweiterung in `/terminplanung/index.astro`:**
```html
<Card title="Kalender abonnieren">
  <p>Dein persönlicher Kalender-Link (automatisch aktualisiert):</p>
  <input readonly value="https://deine-app.com/api/terminplanung/ical/feed?token={user.icalToken}" />

  <button>Link kopieren</button>
  <a href="webcal://...">In Apple Kalender öffnen</a>
  <button>Token erneuern</button>
</Card>
```

**Funktionsweise:**
- Jeder User hat automatisch einen eindeutigen Token (UUID)
- Token wird bei User-Erstellung automatisch generiert
- Bestehende User: Migration generiert Token automatisch
- iCal-URL funktioniert ohne Login (Token = Authentifizierung)
- Kalender-Apps (Apple, Outlook, Google) können abonnieren
- Updates automatisch (täglich/stündlich, je nach App)

**Sicherheit:**
- Token ist UUID v4 (nicht erraten)
- Token kann regeneriert werden
- User sieht nur seinen eigenen Link
- Alte Token werden ungültig nach Regenerierung

#### C) UI/UX-Verbesserungen

**Detail-Seite (`/terminplanung/[id].astro`):**
- Übersichtlichere Abstimmungs-Anzeige (Teilnehmer-Liste mit Icons)
- Kommentar-Threads visuell einrücken (Replies)
- Loading-States für async Aktionen (Spinner)
- Bessere Error-Meldungen

**Navigation:**
- "Zurück zur Übersicht"-Link
- Breadcrumbs: Home → Terminplanung → {Titel}

**Responsive Design:**
- Mobile-optimierte Darstellung
- Touch-optimierte Buttons
- Kollabierbare Abschnitte auf kleinen Screens

**Priorität:** MITTEL

---

### Prioritäten-Reihenfolge (Empfehlung)

1. **Login-Optionen** (schnell, low-risk)
2. **Terminplanung Kalender** (UI-Verbesserung, hoher User-Value)
3. **E-Mail-System** (Infrastruktur, zeitkritisch für 1. Februar)
4. **Auth-Sicherheit** (vor Production-Deploy!)

---

### Notizen

- **Hosting:** Raspberry Pi mit Docker
- **Kein PDF-Export** nötig für Statistiken
- **Keine Erinnerungen/Recurring** für Termine
- **Aktueller Login:** E-Mail (nur für Dev)
# 🏠 Nutzerkosten-Abrechnungs-App

Eine moderne Webanwendung für die Abrechnung von Nutzerkosten in Wohngemeinschaften mit gemeinsamem Öltank. Das System berechnet automatisch Kostenaufteilungen basierend auf Zählerständen und Überlappungen.

## ✨ Features

- **Zählerstand-basierte Kostenaufteilung**: Überlappungen werden automatisch erkannt und gleichmäßig aufgeteilt
- **Intuitive Aufenthaltsverwaltung**: Einfaches Erfassen von Aufenthalten mit Zählerständen
- **Tankfüllungsverwaltung**: Überwachung des Ölverbrauchs und Trend-Analysen
- **Detaillierte Statistiken**: Chart.js-basierte Visualisierungen und Auswertungen
- **Responsive Design**: Moderne UI mit Tailwind CSS und Dark/Light Mode
- **Vue.js Integration**: Interaktive Formulare und Komponenten

## 🚀 Tech Stack

- **Framework**: Astro.js mit TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js
- **Frontend**: Vue.js für interaktive Teile
- **Database**: PostgreSQL mit Prisma ORM
- **Authentication**: (Geplant: Auth.js)

## 📋 Voraussetzungen

- Node.js 18+ 
- npm oder yarn
- PostgreSQL Datenbank

## 🛠️ Installation

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
   cp .env.example .env
   ```
   
   Bearbeiten Sie die `.env` Datei:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/nutzerkosten_db"
   AUTH_SECRET="your-secret-key-here"
   AUTH_URL="http://localhost:4321"
   NODE_ENV="development"
   ```

4. **Datenbank einrichten**
   ```bash
   # Prisma Client generieren
   npx prisma generate
   
   # Datenbank-Migration ausführen
   npx prisma migrate dev --name init
   
   # (Optional) Seed-Daten einfügen
   npx prisma db seed
   ```

5. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

   Die Anwendung ist dann unter `http://localhost:4321` verfügbar.

## 🏗️ Projektstruktur

```
src/
├── components/          # Wiederverwendbare Vue.js Komponenten
├── layouts/            # Astro Layouts
├── pages/              # Seiten der Anwendung
│   ├── index.astro     # Dashboard
│   ├── aufenthalte/    # Aufenthaltsverwaltung
│   ├── tankfuellungen/ # Tankfüllungsverwaltung
│   ├── statistiken/    # Statistiken und Charts
│   └── login.astro     # Anmeldeseite
├── styles/             # Globale Styles
└── utils/              # Hilfsfunktionen

prisma/
├── schema.prisma       # Datenbankschema
└── migrations/         # Datenbank-Migrationen
```

## 🎯 Kernfunktionen

### 1. Aufenthaltsverwaltung
- Erfassen von Aufenthalten mit Ankunft/Abreise
- Zählerstand-basierte Verbrauchsberechnung
- Automatische Überlappungserkennung
- Kostenaufteilung bei gleichzeitigen Aufenthalten

### 2. Tankfüllungsverwaltung
- Erfassen von Tankfüllungen
- Verbrauchsberechnung basierend auf Tankdaten
- Trend-Analysen und Abweichungswarnungen
- Fallback-Wert (5.5 L/h) bis echte Daten verfügbar

### 3. Kostenkalkulation
- Ölkosten: Verbrauchte Stunden × Verbrauch/Stunde × Ölpreis
- Übernachtungskosten: Anzahl Nächte × Preis pro Kategorie
- Automatische Aufteilung bei Überlappungen

### 4. Statistiken & Analysen
- Monatliche Verbrauchsstatistiken
- Jahresvergleiche
- Personen-spezifische Auswertungen
- Export-Funktionen (PDF, Excel, CSV)

## 🔧 Konfiguration

### Preise konfigurieren
Die Standardpreise können in der Datenbank angepasst werden:

```sql
INSERT INTO "Preise" (jahr, oelpreisProLiter, uebernachtungMitglied, uebernachtungGast, verbrauchProStunde)
VALUES (2024, 1.20, 15.00, 25.00, 5.5);
```

### Zählerstand-Überlappungs-Algorithmus
Das System erkennt automatisch Überlappungen in Zählerständen:

- **Beispiel**: 
  - Person A: Zähler 100-110h
  - Person B: Zähler 105-115h
  - Person C: Zähler 107-112h

- **Aufteilung**:
  - 100-105h: nur Person A (100%)
  - 105-107h: Person A + B teilen sich (50%/50%)
  - 107-110h: Person A + B + C teilen sich (33%/33%/33%)
  - 110-112h: Person B + C teilen sich (50%/50%)
  - 112-115h: nur Person B (100%)

## 🚀 Deployment

### Netlify (Empfohlen)
1. Repository zu Netlify verbinden
2. Build-Befehl: `npm run build`
3. Publish-Verzeichnis: `dist`

### Andere Plattformen
- **Vercel**: `npm run build`
- **Railway**: Automatisches Deployment
- **Docker**: Dockerfile verfügbar

## 📱 Verwendung

### Für Benutzer
1. **Anmelden** über die Login-Seite
2. **Neuen Aufenthalt erfassen** mit Zählerständen
3. **Eigene Statistiken einsehen** im Dashboard
4. **Kostenübersicht** pro Aufenthalt

### Für Admins
1. **Tankfüllungen verwalten**
2. **Preise konfigurieren**
3. **Jahresabschlüsse** durchführen
4. **Alle Daten einsehen** und bearbeiten

## 🧪 Entwicklung

### Verfügbare Scripts
```bash
npm run dev          # Entwicklungsserver starten
npm run build        # Produktions-Build erstellen
npm run preview      # Produktions-Build lokal testen
npm run astro        # Astro CLI-Befehle
```

### Datenbank-Entwicklung
```bash
npx prisma studio    # Datenbank-GUI öffnen
npx prisma migrate   # Migrationen verwalten
npx prisma generate  # Client neu generieren
```

## 🤝 Beitragen

1. Fork des Repositories
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe `LICENSE` für Details.

## 🆘 Support

Bei Fragen oder Problemen:
- Issue im GitHub Repository erstellen
- Dokumentation durchsuchen
- Community-Forum nutzen

## 🔮 Roadmap

- [ ] Authentifizierung mit Auth.js
- [ ] API-Endpunkte für mobile Apps
- [ ] Push-Benachrichtigungen
- [ ] Multi-Sprach-Support
- [ ] Erweiterte Export-Funktionen
- [ ] Mobile App (React Native/Flutter)

---

**Entwickelt mit ❤️ für Wohngemeinschaften**

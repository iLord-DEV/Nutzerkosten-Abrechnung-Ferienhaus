# Datenbank-Sicherung

## Automatisches Backup

### Backup erstellen
```bash
npm run db:backup
```

Das Skript erstellt:
- Ein SQL-Dump der MySQL-Datenbank
- Komprimiertes Backup im `./backups/` Verzeichnis
- Automatische Bereinigung alter Backups (>30 Tage)

### Backup wiederherstellen
```bash
# Backup entpacken und wiederherstellen
gunzip -c backups/backup_nutzerkosten_db_YYYYMMDD_HHMMSS.sql.gz | mysql -u root -p nutzerkosten_db
```

## Manuelle Backups

### Mit mysqldump
```bash
mysqldump -u root -p nutzerkosten_db > backup_manual.sql
```

### Mit Prisma
```bash
# Schema exportieren
npx prisma db pull

# Daten exportieren (falls nötig)
npx prisma db seed
```

## Backup-Strategie

### Empfohlene Häufigkeit
- **Täglich**: Automatische Backups (cron job)
- **Vor Updates**: Manuelles Backup
- **Wöchentlich**: Vollständiges Backup + Test

### Cron Job einrichten
```bash
# Täglich um 2 Uhr morgens
0 2 * * * cd /path/to/astro-app && npm run db:backup
```

### Backup-Verzeichnis
```
backups/
├── backup_nutzerkosten_db_20241205_020000.sql.gz
├── backup_nutzerkosten_db_20241206_020000.sql.gz
└── ...
```

## Wichtige Hinweise

⚠️ **Sicherheit**: Backups enthalten sensible Daten!
- Backups verschlüsseln
- Sichere Speicherung (nicht in Git)
- Regelmäßige Tests der Wiederherstellung

✅ **Best Practices**:
- Backups vor größeren Änderungen
- Test der Wiederherstellung
- Monitoring der Backup-Größe
- Dokumentation der Backup-Strategie

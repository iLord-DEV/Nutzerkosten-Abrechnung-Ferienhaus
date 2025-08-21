/*
  Warnings:

  - You are about to drop the column `zaehlerstandEnde` on the `Aufenthalt` table. All the data in the column will be lost.
  - You are about to drop the column `zaehlerstandStart` on the `Aufenthalt` table. All the data in the column will be lost.
  - You are about to drop the column `abschlussAm` on the `JahresAbschluss` table. All the data in the column will be lost.
  - You are about to drop the column `berechnungen` on the `JahresAbschluss` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `JahresAbschluss` table. All the data in the column will be lost.
*/

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Aufenthalt-Tabelle aktualisieren
CREATE TABLE "new_Aufenthalt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "ankunft" DATETIME NOT NULL,
    "abreise" DATETIME NOT NULL,
    "zaehlerAnkunft" REAL NOT NULL,
    "zaehlerAbreise" REAL NOT NULL,
    "anzahlMitglieder" INTEGER NOT NULL,
    "anzahlGaeste" INTEGER NOT NULL,
    "jahr" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aufenthalt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Daten migrieren: zaehlerstandStart -> zaehlerAnkunft, zaehlerstandEnde -> zaehlerAbreise
INSERT INTO "new_Aufenthalt" ("abreise", "ankunft", "anzahlGaeste", "anzahlMitglieder", "createdAt", "id", "jahr", "updatedAt", "userId", "zaehlerAnkunft", "zaehlerAbreise") 
SELECT "abreise", "ankunft", "anzahlGaeste", "anzahlMitglieder", "createdAt", "id", "jahr", "updatedAt", "userId", "zaehlerstandStart", "zaehlerstandEnde" 
FROM "Aufenthalt";

DROP TABLE "Aufenthalt";
ALTER TABLE "new_Aufenthalt" RENAME TO "Aufenthalt";

-- JahresAbschluss-Tabelle aktualisieren
CREATE TABLE "new_JahresAbschluss" (
    "jahr" INTEGER NOT NULL PRIMARY KEY,
    "zaehlerstand" REAL NOT NULL,
    "gesamtKosten" REAL NOT NULL,
    "anzahlAufenthalte" INTEGER NOT NULL,
    "verbrauchProStunde" REAL NOT NULL
);

-- Daten migrieren mit Standardwerten
INSERT INTO "new_JahresAbschluss" ("jahr", "zaehlerstand", "gesamtKosten", "anzahlAufenthalte", "verbrauchProStunde") 
SELECT "jahr", 0.0, 0.0, 0, 5.5 FROM "JahresAbschluss";

DROP TABLE "JahresAbschluss";
ALTER TABLE "new_JahresAbschluss" RENAME TO "JahresAbschluss";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

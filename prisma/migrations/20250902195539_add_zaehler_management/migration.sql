-- CreateTable
CREATE TABLE "Zaehler" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriennummer" TEXT,
    "einbauDatum" DATETIME NOT NULL,
    "ausbauDatum" DATETIME,
    "letzterStand" REAL NOT NULL,
    "istAktiv" BOOLEAN NOT NULL DEFAULT true,
    "notizen" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "zaehlerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aufenthalt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Aufenthalt_zaehlerId_fkey" FOREIGN KEY ("zaehlerId") REFERENCES "Zaehler" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Aufenthalt" ("abreise", "ankunft", "anzahlGaeste", "anzahlMitglieder", "createdAt", "id", "jahr", "updatedAt", "userId", "zaehlerAbreise", "zaehlerAnkunft") SELECT "abreise", "ankunft", "anzahlGaeste", "anzahlMitglieder", "createdAt", "id", "jahr", "updatedAt", "userId", "zaehlerAbreise", "zaehlerAnkunft" FROM "Aufenthalt";
DROP TABLE "Aufenthalt";
ALTER TABLE "new_Aufenthalt" RENAME TO "Aufenthalt";
CREATE TABLE "new_Tankfuellung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datum" DATETIME NOT NULL,
    "liter" REAL NOT NULL,
    "preisProLiter" REAL NOT NULL,
    "zaehlerstand" REAL NOT NULL,
    "zaehlerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tankfuellung_zaehlerId_fkey" FOREIGN KEY ("zaehlerId") REFERENCES "Zaehler" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tankfuellung" ("createdAt", "datum", "id", "liter", "preisProLiter", "zaehlerstand") SELECT "createdAt", "datum", "id", "liter", "preisProLiter", "zaehlerstand" FROM "Tankfuellung";
DROP TABLE "Tankfuellung";
ALTER TABLE "new_Tankfuellung" RENAME TO "Tankfuellung";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

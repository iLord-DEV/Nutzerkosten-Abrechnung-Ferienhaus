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
    "zaehlerAbreiseId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aufenthalt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Aufenthalt_zaehlerId_fkey" FOREIGN KEY ("zaehlerId") REFERENCES "Zaehler" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Aufenthalt_zaehlerAbreiseId_fkey" FOREIGN KEY ("zaehlerAbreiseId") REFERENCES "Zaehler" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Aufenthalt" ("abreise", "ankunft", "anzahlGaeste", "anzahlMitglieder", "createdAt", "id", "jahr", "updatedAt", "userId", "zaehlerAbreise", "zaehlerAnkunft", "zaehlerId") SELECT "abreise", "ankunft", "anzahlGaeste", "anzahlMitglieder", "createdAt", "id", "jahr", "updatedAt", "userId", "zaehlerAbreise", "zaehlerAnkunft", "zaehlerId" FROM "Aufenthalt";
DROP TABLE "Aufenthalt";
ALTER TABLE "new_Aufenthalt" RENAME TO "Aufenthalt";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

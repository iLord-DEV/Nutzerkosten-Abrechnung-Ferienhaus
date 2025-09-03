/*
  Warnings:

  - You are about to drop the column `seriennummer` on the `Zaehler` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Zaehler" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "einbauDatum" DATETIME NOT NULL,
    "ausbauDatum" DATETIME,
    "letzterStand" REAL NOT NULL,
    "istAktiv" BOOLEAN NOT NULL DEFAULT true,
    "notizen" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Zaehler" ("ausbauDatum", "createdAt", "einbauDatum", "id", "istAktiv", "letzterStand", "notizen", "updatedAt") SELECT "ausbauDatum", "createdAt", "einbauDatum", "id", "istAktiv", "letzterStand", "notizen", "updatedAt" FROM "Zaehler";
DROP TABLE "Zaehler";
ALTER TABLE "new_Zaehler" RENAME TO "Zaehler";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - You are about to drop the column `userId` on the `Tankfuellung` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tankfuellung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datum" DATETIME NOT NULL,
    "liter" REAL NOT NULL,
    "preisProLiter" REAL NOT NULL,
    "zaehlerstand" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Tankfuellung" ("createdAt", "datum", "id", "liter", "preisProLiter", "zaehlerstand") SELECT "createdAt", "datum", "id", "liter", "preisProLiter", "zaehlerstand" FROM "Tankfuellung";
DROP TABLE "Tankfuellung";
ALTER TABLE "new_Tankfuellung" RENAME TO "Tankfuellung";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

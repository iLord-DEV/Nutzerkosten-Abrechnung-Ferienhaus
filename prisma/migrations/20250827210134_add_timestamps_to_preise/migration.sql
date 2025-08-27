/*
  Warnings:

  - Added the required column `updatedAt` to the `Preise` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Preise" (
    "jahr" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "oelpreisProLiter" REAL NOT NULL,
    "uebernachtungMitglied" REAL NOT NULL,
    "uebernachtungGast" REAL NOT NULL,
    "verbrauchProStunde" REAL NOT NULL DEFAULT 5.5,
    "istBerechnet" BOOLEAN NOT NULL DEFAULT false,
    "gueltigAb" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Preise" ("gueltigAb", "istBerechnet", "jahr", "oelpreisProLiter", "uebernachtungGast", "uebernachtungMitglied", "verbrauchProStunde", "createdAt", "updatedAt") SELECT "gueltigAb", "istBerechnet", "jahr", "oelpreisProLiter", "uebernachtungGast", "uebernachtungMitglied", "verbrauchProStunde", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Preise";
DROP TABLE "Preise";
ALTER TABLE "new_Preise" RENAME TO "Preise";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

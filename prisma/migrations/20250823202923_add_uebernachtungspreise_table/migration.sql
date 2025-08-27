-- CreateTable
CREATE TABLE "Uebernachtungspreise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gueltigAb" DATETIME NOT NULL,
    "uebernachtungMitglied" REAL NOT NULL,
    "uebernachtungGast" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Uebernachtungspreise_gueltigAb_key" ON "Uebernachtungspreise"("gueltigAb");

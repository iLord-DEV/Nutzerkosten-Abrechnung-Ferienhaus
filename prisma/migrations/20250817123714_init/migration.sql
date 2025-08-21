-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Aufenthalt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "ankunft" DATETIME NOT NULL,
    "abreise" DATETIME NOT NULL,
    "zaehlerstandStart" REAL NOT NULL,
    "zaehlerstandEnde" REAL NOT NULL,
    "anzahlMitglieder" INTEGER NOT NULL,
    "anzahlGaeste" INTEGER NOT NULL,
    "jahr" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aufenthalt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tankfuellung" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datum" DATETIME NOT NULL,
    "liter" REAL NOT NULL,
    "preisProLiter" REAL NOT NULL,
    "zaehlerstand" REAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tankfuellung_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Preise" (
    "jahr" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "oelpreisProLiter" REAL NOT NULL,
    "uebernachtungMitglied" REAL NOT NULL,
    "uebernachtungGast" REAL NOT NULL,
    "verbrauchProStunde" REAL NOT NULL DEFAULT 5.5,
    "istBerechnet" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "JahresAbschluss" (
    "jahr" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL,
    "abschlussAm" DATETIME,
    "berechnungen" JSONB
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

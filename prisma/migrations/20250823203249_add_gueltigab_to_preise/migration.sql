/*
  Warnings:

  - You are about to drop the `Uebernachtungspreise` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Preise" ADD COLUMN "gueltigAb" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Uebernachtungspreise";
PRAGMA foreign_keys=on;

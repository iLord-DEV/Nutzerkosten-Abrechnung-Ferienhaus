-- AlterTable
ALTER TABLE `User` ADD COLUMN `notifyOnComments` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `notifyOnTermine` BOOLEAN NOT NULL DEFAULT false;

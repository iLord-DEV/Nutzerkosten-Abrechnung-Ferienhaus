-- AlterTable
ALTER TABLE `TerminKommentar` ADD COLUMN `parentId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `TerminKommentar` ADD CONSTRAINT `TerminKommentar_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `TerminKommentar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

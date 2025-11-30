-- AlterTable
ALTER TABLE `ImageLibrary` ADD COLUMN `mediaType` VARCHAR(191) NOT NULL DEFAULT 'image',
    ADD COLUMN `mimeType` VARCHAR(191) NULL,
    ADD COLUMN `thumbnail` VARCHAR(191) NULL;

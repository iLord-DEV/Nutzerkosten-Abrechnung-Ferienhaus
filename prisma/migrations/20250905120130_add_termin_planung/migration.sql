-- CreateTable
CREATE TABLE `TerminPlanung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `titel` VARCHAR(191) NOT NULL,
    `startDatum` DATETIME(3) NOT NULL,
    `endDatum` DATETIME(3) NOT NULL,
    `beschreibung` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'DISCUSSING', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TerminAbstimmung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `terminPlanungId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `stimme` ENUM('APPROVE', 'NEED_INFO') NOT NULL,
    `kommentar` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TerminKommentar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `terminPlanungId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `inhalt` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TerminAenderung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `terminPlanungId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `alteStartDatum` DATETIME(3) NOT NULL,
    `alteEndDatum` DATETIME(3) NOT NULL,
    `neueStartDatum` DATETIME(3) NOT NULL,
    `neueEndDatum` DATETIME(3) NOT NULL,
    `grund` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TerminPlanung` ADD CONSTRAINT `TerminPlanung_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TerminAbstimmung` ADD CONSTRAINT `TerminAbstimmung_terminPlanungId_fkey` FOREIGN KEY (`terminPlanungId`) REFERENCES `TerminPlanung`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TerminAbstimmung` ADD CONSTRAINT `TerminAbstimmung_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TerminKommentar` ADD CONSTRAINT `TerminKommentar_terminPlanungId_fkey` FOREIGN KEY (`terminPlanungId`) REFERENCES `TerminPlanung`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TerminKommentar` ADD CONSTRAINT `TerminKommentar_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TerminAenderung` ADD CONSTRAINT `TerminAenderung_terminPlanungId_fkey` FOREIGN KEY (`terminPlanungId`) REFERENCES `TerminPlanung`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TerminAenderung` ADD CONSTRAINT `TerminAenderung_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

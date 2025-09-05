-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Aufenthalt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `ankunft` DATETIME(3) NOT NULL,
    `abreise` DATETIME(3) NOT NULL,
    `zaehlerAnkunft` DOUBLE NOT NULL,
    `zaehlerAbreise` DOUBLE NOT NULL,
    `uebernachtungenMitglieder` INTEGER NOT NULL DEFAULT 0,
    `uebernachtungenGaeste` INTEGER NOT NULL DEFAULT 0,
    `jahr` INTEGER NOT NULL,
    `zaehlerId` INTEGER NULL,
    `zaehlerAbreiseId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tankfuellung` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `datum` DATETIME(3) NOT NULL,
    `liter` DOUBLE NOT NULL,
    `preisProLiter` DOUBLE NOT NULL,
    `zaehlerstand` DOUBLE NOT NULL,
    `zaehlerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Zaehler` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `einbauDatum` DATETIME(3) NOT NULL,
    `ausbauDatum` DATETIME(3) NULL,
    `letzterStand` DOUBLE NOT NULL,
    `istAktiv` BOOLEAN NOT NULL DEFAULT true,
    `notizen` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Preise` (
    `jahr` INTEGER NOT NULL,
    `oelpreisProLiter` DOUBLE NOT NULL,
    `uebernachtungMitglied` DOUBLE NOT NULL,
    `uebernachtungGast` DOUBLE NOT NULL,
    `verbrauchProStunde` DOUBLE NOT NULL DEFAULT 5.5,
    `istBerechnet` BOOLEAN NOT NULL DEFAULT false,
    `gueltigAb` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`jahr`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JahresAbschluss` (
    `jahr` INTEGER NOT NULL,
    `zaehlerstand` DOUBLE NOT NULL,
    `gesamtKosten` DOUBLE NOT NULL,
    `anzahlAufenthalte` INTEGER NOT NULL,
    `verbrauchProStunde` DOUBLE NOT NULL,

    PRIMARY KEY (`jahr`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Aufenthalt` ADD CONSTRAINT `Aufenthalt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aufenthalt` ADD CONSTRAINT `Aufenthalt_zaehlerId_fkey` FOREIGN KEY (`zaehlerId`) REFERENCES `Zaehler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aufenthalt` ADD CONSTRAINT `Aufenthalt_zaehlerAbreiseId_fkey` FOREIGN KEY (`zaehlerAbreiseId`) REFERENCES `Zaehler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tankfuellung` ADD CONSTRAINT `Tankfuellung_zaehlerId_fkey` FOREIGN KEY (`zaehlerId`) REFERENCES `Zaehler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

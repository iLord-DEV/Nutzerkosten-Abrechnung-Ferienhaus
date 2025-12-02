-- CreateTable
CREATE TABLE `Checklist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChecklistItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `checklistId` INTEGER NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChecklistItem_checklistId_idx`(`checklistId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserChecklistProgress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `checklistItemId` INTEGER NOT NULL,
    `isChecked` BOOLEAN NOT NULL DEFAULT false,
    `checkedAt` DATETIME(3) NULL,

    INDEX `UserChecklistProgress_userId_idx`(`userId`),
    INDEX `UserChecklistProgress_checklistItemId_idx`(`checklistItemId`),
    UNIQUE INDEX `UserChecklistProgress_userId_checklistItemId_key`(`userId`, `checklistItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ChecklistItem` ADD CONSTRAINT `ChecklistItem_checklistId_fkey` FOREIGN KEY (`checklistId`) REFERENCES `Checklist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserChecklistProgress` ADD CONSTRAINT `UserChecklistProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserChecklistProgress` ADD CONSTRAINT `UserChecklistProgress_checklistItemId_fkey` FOREIGN KEY (`checklistItemId`) REFERENCES `ChecklistItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

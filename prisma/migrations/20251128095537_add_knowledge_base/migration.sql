-- CreateTable
CREATE TABLE `KnowledgeBase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `keywords` TEXT NULL,
    `sourceType` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `sourceUrl` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KnowledgeBase_category_idx`(`category`),
    INDEX `KnowledgeBase_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

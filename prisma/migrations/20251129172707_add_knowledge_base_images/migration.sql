-- CreateTable
CREATE TABLE `KnowledgeBaseImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `knowledgeBaseId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `alt` VARCHAR(191) NULL,
    `caption` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KnowledgeBaseImage_knowledgeBaseId_idx`(`knowledgeBaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KnowledgeBaseImage` ADD CONSTRAINT `KnowledgeBaseImage_knowledgeBaseId_fkey` FOREIGN KEY (`knowledgeBaseId`) REFERENCES `KnowledgeBase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `ImageLibrary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `tags` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    FULLTEXT INDEX `ImageLibrary_title_description_tags_idx`(`title`, `description`, `tags`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

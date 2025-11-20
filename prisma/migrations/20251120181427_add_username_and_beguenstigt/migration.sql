-- AlterTable
ALTER TABLE `User` ADD COLUMN `username` VARCHAR(191) NULL,
  ADD COLUMN `beguenstigt` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

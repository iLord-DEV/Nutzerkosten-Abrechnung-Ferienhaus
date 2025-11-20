-- Remove password field (switched to Magic-Link authentication)
ALTER TABLE `User` DROP COLUMN `password`;

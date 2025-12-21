-- AlterTable
ALTER TABLE `KnowledgeBase` ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `KnowledgeBase_priority_idx` ON `KnowledgeBase`(`priority`);

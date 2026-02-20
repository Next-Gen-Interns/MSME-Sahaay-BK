-- AlterTable
ALTER TABLE `leadconversation` ADD COLUMN `delivered_at` DATETIME(3) NULL,
    ADD COLUMN `is_read` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `read_at` DATETIME(3) NULL;

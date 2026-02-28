-- AlterTable
ALTER TABLE `user` ADD COLUMN `active_profile` ENUM('buyer', 'seller') NULL;

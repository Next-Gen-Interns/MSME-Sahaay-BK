/*
  Warnings:

  - You are about to drop the column `location` on the `buyerprofile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `buyerprofile` DROP COLUMN `location`,
    ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `servicelisting` ADD COLUMN `service_cities` JSON NULL,
    ADD COLUMN `service_countries` JSON NULL,
    ADD COLUMN `service_states` JSON NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `city` VARCHAR(191) NULL,
    MODIFY `role` ENUM('super_admin', 'access_admin', 'admin', 'buyer', 'seller') NOT NULL DEFAULT 'buyer';

-- CreateTable
CREATE TABLE `businessaddress` (
    `address_id` INTEGER NOT NULL AUTO_INCREMENT,
    `seller_id` INTEGER NOT NULL,
    `business_country` VARCHAR(191) NOT NULL,
    `business_state` VARCHAR(191) NOT NULL,
    `business_city` VARCHAR(191) NOT NULL,
    `business_address` VARCHAR(191) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `businessaddress_seller_id_fkey`(`seller_id`),
    PRIMARY KEY (`address_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `businessaddress` ADD CONSTRAINT `businessaddress_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `sellerprofile`(`seller_id`) ON DELETE CASCADE ON UPDATE CASCADE;

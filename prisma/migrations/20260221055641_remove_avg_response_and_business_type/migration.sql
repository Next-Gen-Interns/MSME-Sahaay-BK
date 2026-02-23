/*
  Warnings:

  - You are about to drop the column `average_response_time` on the `sellerprofile` table. All the data in the column will be lost.
  - You are about to drop the column `business_type_id` on the `sellerprofile` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `sellerprofile` DROP FOREIGN KEY `sellerprofile_business_type_id_fkey`;

-- DropIndex
DROP INDEX `sellerprofile_business_type_id_fkey` ON `sellerprofile`;

-- AlterTable
ALTER TABLE `sellerprofile` DROP COLUMN `average_response_time`,
    DROP COLUMN `business_type_id`;

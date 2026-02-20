/*
  Warnings:

  - Made the column `fullname` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `user` MODIFY `fullname` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `reviewflag` (
    `flag_id` INTEGER NOT NULL AUTO_INCREMENT,
    `review_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `reviewflag_review_id_user_id_key`(`review_id`, `user_id`),
    PRIMARY KEY (`flag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reviewflag` ADD CONSTRAINT `reviewflag_review_id_fkey` FOREIGN KEY (`review_id`) REFERENCES `review`(`review_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviewflag` ADD CONSTRAINT `reviewflag_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

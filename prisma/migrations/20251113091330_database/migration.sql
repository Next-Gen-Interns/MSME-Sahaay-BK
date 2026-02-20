-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `lead_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `lead_seller_id_fkey`;

-- DropForeignKey
ALTER TABLE `leadconversation` DROP FOREIGN KEY `leadconversation_participant_id_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `review_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `review_reviewed_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `review_reviewer_id_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `review_seller_id_fkey`;

-- DropForeignKey
ALTER TABLE `servicelisting` DROP FOREIGN KEY `servicelisting_category_id_fkey`;

-- AddForeignKey
ALTER TABLE `servicelisting` ADD CONSTRAINT `servicelisting_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`category_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `buyerprofile`(`buyer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `sellerprofile`(`seller_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadconversation` ADD CONSTRAINT `leadconversation_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `buyerprofile`(`buyer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_reviewed_user_id_fkey` FOREIGN KEY (`reviewed_user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `sellerprofile`(`seller_id`) ON DELETE CASCADE ON UPDATE CASCADE;

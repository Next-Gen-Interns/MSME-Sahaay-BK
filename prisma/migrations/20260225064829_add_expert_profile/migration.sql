-- CreateTable
CREATE TABLE `expertprofile` (
    `expert_id` INTEGER NOT NULL AUTO_INCREMENT,
    `seller_id` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `experience_years` INTEGER NOT NULL,
    `expertise` JSON NOT NULL,
    `consultation_fee` DOUBLE NULL,
    `bio` LONGTEXT NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `consultation_listing_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expertprofile_seller_id_key`(`seller_id`),
    INDEX `expertprofile_is_verified_idx`(`is_verified`),
    PRIMARY KEY (`expert_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `expertprofile` ADD CONSTRAINT `expertprofile_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `sellerprofile`(`seller_id`) ON DELETE CASCADE ON UPDATE CASCADE;

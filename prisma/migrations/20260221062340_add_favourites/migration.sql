-- CreateTable
CREATE TABLE `Favourite` (
    `favourite_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `listing_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Favourite_user_id_idx`(`user_id`),
    INDEX `Favourite_listing_id_idx`(`listing_id`),
    UNIQUE INDEX `Favourite_user_id_listing_id_key`(`user_id`, `listing_id`),
    PRIMARY KEY (`favourite_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Favourite` ADD CONSTRAINT `Favourite_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favourite` ADD CONSTRAINT `Favourite_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `servicelisting`(`listing_id`) ON DELETE CASCADE ON UPDATE CASCADE;

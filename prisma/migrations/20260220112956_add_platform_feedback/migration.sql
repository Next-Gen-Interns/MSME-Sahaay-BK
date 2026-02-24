-- CreateTable
CREATE TABLE `platformfeedback` (
    `feedback_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `company` VARCHAR(191) NULL,
    `user_type` VARCHAR(191) NOT NULL,
    `feedback_type` VARCHAR(191) NOT NULL,
    `rating` INTEGER NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `file_url` VARCHAR(191) NULL,
    `consent` BOOLEAN NOT NULL,
    `status` ENUM('pending', 'reviewed', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `platformfeedback_user_id_idx`(`user_id`),
    PRIMARY KEY (`feedback_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `platformfeedback` ADD CONSTRAINT `platformfeedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `user` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('admin', 'buyer', 'seller') NOT NULL DEFAULT 'buyer',
    `last_login` DATETIME(3) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `avatar_url` VARCHAR(191) NULL,
    `bio` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buyerprofile` (
    `buyer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NULL,
    `location` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `buyerprofile_user_id_key`(`user_id`),
    PRIMARY KEY (`buyer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sellerprofile` (
    `seller_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `business_name` VARCHAR(191) NOT NULL,
    `business_description` VARCHAR(191) NULL,
    `product_categories` VARCHAR(191) NULL,
    `certifications` VARCHAR(191) NULL,
    `verification_status` ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    `subscription_plan` ENUM('free', 'premium') NOT NULL DEFAULT 'free',
    `profile_views` INTEGER NOT NULL DEFAULT 0,
    `leads_received` INTEGER NOT NULL DEFAULT 0,
    `overall_rating` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `average_response_time` DOUBLE NULL,
    `business_type_id` INTEGER NULL,
    `years_in_business` INTEGER NULL,

    UNIQUE INDEX `sellerprofile_user_id_key`(`user_id`),
    INDEX `sellerprofile_business_type_id_fkey`(`business_type_id`),
    PRIMARY KEY (`seller_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userdocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `document_type` VARCHAR(191) NOT NULL,
    `document_name` VARCHAR(191) NOT NULL,
    `document_url` VARCHAR(191) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` INTEGER NULL,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `userdocument_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passwordresettoken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `passwordresettoken_token_key`(`token`),
    INDEX `passwordresettoken_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category` (
    `category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `parent_category_id` INTEGER NULL,

    INDEX `category_parent_category_id_fkey`(`parent_category_id`),
    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `servicelisting` (
    `listing_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `service_type` ENUM('one_time', 'ongoing', 'consultation', 'project_based') NOT NULL,
    `pricing_model` ENUM('fixed', 'hourly', 'daily', 'custom_quote') NOT NULL,
    `min_price` DOUBLE NULL,
    `max_price` DOUBLE NULL,
    `estimated_timeline` VARCHAR(191) NULL,
    `service_areas` JSON NULL,
    `status` ENUM('draft', 'active', 'inactive') NOT NULL DEFAULT 'draft',
    `tags` JSON NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `lead_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `seller_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    INDEX `servicelisting_category_id_fkey`(`category_id`),
    INDEX `servicelisting_seller_id_fkey`(`seller_id`),
    PRIMARY KEY (`listing_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead` (
    `lead_id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_title` VARCHAR(191) NULL,
    `project_description` VARCHAR(191) NULL,
    `budget_range` ENUM('under_1k', 'k_1_5', 'k_5_10', 'k_10_25', 'k_25_50', 'k_50_100', 'k_100_plus') NULL,
    `timeline` ENUM('immediately', 'weeks_1_2', 'month_1', 'flexible') NULL,
    `contact_preference` ENUM('email', 'phone', 'video_call', 'in_person') NOT NULL,
    `custom_requirements` VARCHAR(191) NULL,
    `is_urgent` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost') NOT NULL DEFAULT 'new',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `listing_id` INTEGER NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `seller_id` INTEGER NOT NULL,

    INDEX `lead_buyer_id_fkey`(`buyer_id`),
    INDEX `lead_listing_id_fkey`(`listing_id`),
    INDEX `lead_seller_id_fkey`(`seller_id`),
    PRIMARY KEY (`lead_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leadconversation` (
    `conversation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `message_type` ENUM('initial_inquiry', 'follow_up', 'proposal', 'negotiation') NOT NULL DEFAULT 'initial_inquiry',
    `message_text` VARCHAR(191) NOT NULL,
    `attachments` JSON NULL,
    `internal_notes` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lead_id` INTEGER NOT NULL,
    `participant_id` INTEGER NOT NULL,

    INDEX `leadconversation_lead_id_fkey`(`lead_id`),
    INDEX `leadconversation_participant_id_fkey`(`participant_id`),
    PRIMARY KEY (`conversation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review` (
    `review_id` INTEGER NOT NULL AUTO_INCREMENT,
    `rating` INTEGER NOT NULL,
    `review_text` VARCHAR(191) NULL,
    `review_type` ENUM('buyer_to_seller', 'seller_to_buyer') NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lead_id` INTEGER NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `seller_id` INTEGER NOT NULL,
    `reviewer_id` INTEGER NOT NULL,
    `reviewed_user_id` INTEGER NOT NULL,

    INDEX `review_buyer_id_fkey`(`buyer_id`),
    INDEX `review_lead_id_fkey`(`lead_id`),
    INDEX `review_reviewed_user_id_fkey`(`reviewed_user_id`),
    INDEX `review_reviewer_id_fkey`(`reviewer_id`),
    INDEX `review_seller_id_fkey`(`seller_id`),
    PRIMARY KEY (`review_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `listingmedia` (
    `listing_media_id` INTEGER NOT NULL AUTO_INCREMENT,
    `file_path` VARCHAR(191) NOT NULL,
    `file_type` ENUM('image', 'video', 'document', 'portfolio') NOT NULL,
    `caption` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `listing_id` INTEGER NOT NULL,

    INDEX `listingmedia_listing_id_fkey`(`listing_id`),
    PRIMARY KEY (`listing_media_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `businesstype` (
    `business_type_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`business_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `buyerprofile` ADD CONSTRAINT `buyerprofile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sellerprofile` ADD CONSTRAINT `sellerprofile_business_type_id_fkey` FOREIGN KEY (`business_type_id`) REFERENCES `businesstype`(`business_type_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sellerprofile` ADD CONSTRAINT `sellerprofile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userdocument` ADD CONSTRAINT `userdocument_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passwordresettoken` ADD CONSTRAINT `passwordresettoken_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category` ADD CONSTRAINT `category_parent_category_id_fkey` FOREIGN KEY (`parent_category_id`) REFERENCES `category`(`category_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servicelisting` ADD CONSTRAINT `servicelisting_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `servicelisting` ADD CONSTRAINT `servicelisting_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `sellerprofile`(`seller_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `buyerprofile`(`buyer_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `servicelisting`(`listing_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `lead_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `sellerprofile`(`seller_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadconversation` ADD CONSTRAINT `leadconversation_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`lead_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leadconversation` ADD CONSTRAINT `leadconversation_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `buyerprofile`(`buyer_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`lead_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_reviewed_user_id_fkey` FOREIGN KEY (`reviewed_user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `review_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `sellerprofile`(`seller_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listingmedia` ADD CONSTRAINT `listingmedia_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `servicelisting`(`listing_id`) ON DELETE CASCADE ON UPDATE CASCADE;

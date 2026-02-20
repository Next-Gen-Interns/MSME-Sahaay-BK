-- CreateTable
CREATE TABLE `subscriptionplan` (
    `plan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `billing_cycle` ENUM('monthly', 'quarterly', 'yearly', 'lifetime') NOT NULL DEFAULT 'monthly',
    `plan_type` ENUM('buyer', 'seller', 'both') NOT NULL,
    `features` JSON NOT NULL,
    `limits` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usersubscription` (
    `subscription_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan_id` INTEGER NOT NULL,
    `status` ENUM('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing') NOT NULL DEFAULT 'active',
    `current_period_start` DATETIME(3) NOT NULL,
    `current_period_end` DATETIME(3) NOT NULL,
    `cancel_at_period_end` BOOLEAN NOT NULL DEFAULT false,
    `canceled_at` DATETIME(3) NULL,
    `stripe_subscription_id` VARCHAR(191) NULL,
    `stripe_customer_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `usersubscription_plan_id_fkey`(`plan_id`),
    UNIQUE INDEX `UserSubscription_user_id_key`(`user_id`),
    PRIMARY KEY (`subscription_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptionusage` (
    `usage_id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscription_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `feature_type` ENUM('service_listings', 'featured_listings', 'lead_access', 'portfolio_items', 'analytics_access', 'premium_support', 'lead_creation', 'premium_search', 'seller_contact', 'project_management', 'saved_searches') NOT NULL,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `reset_date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `subscriptionusage_user_id_fkey`(`user_id`),
    UNIQUE INDEX `subscriptionusage_feature_unique`(`subscription_id`, `feature_type`, `reset_date`),
    PRIMARY KEY (`usage_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usersubscription` ADD CONSTRAINT `usersubscription_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usersubscription` ADD CONSTRAINT `usersubscription_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `subscriptionplan`(`plan_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptionusage` ADD CONSTRAINT `subscriptionusage_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `usersubscription`(`subscription_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptionusage` ADD CONSTRAINT `subscriptionusage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

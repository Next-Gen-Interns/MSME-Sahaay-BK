-- CreateIndex
CREATE INDEX `servicelisting_status_category_id_idx` ON `servicelisting`(`status`, `category_id`);

-- CreateIndex
CREATE INDEX `servicelisting_status_service_type_idx` ON `servicelisting`(`status`, `service_type`);

-- CreateIndex
CREATE INDEX `servicelisting_status_min_price_max_price_idx` ON `servicelisting`(`status`, `min_price`, `max_price`);

-- CreateIndex
CREATE INDEX `servicelisting_status_featured_idx` ON `servicelisting`(`status`, `featured`);

-- CreateIndex
CREATE INDEX `servicelisting_status_created_at_idx` ON `servicelisting`(`status`, `created_at`);

-- CreateIndex
CREATE INDEX `servicelisting_status_view_count_idx` ON `servicelisting`(`status`, `view_count`);

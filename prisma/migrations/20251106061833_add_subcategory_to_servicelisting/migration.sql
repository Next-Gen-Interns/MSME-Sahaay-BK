-- AlterTable
ALTER TABLE `servicelisting` ADD COLUMN `subcategory_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `servicelisting_subcategory_id_fkey` ON `servicelisting`(`subcategory_id`);

-- AddForeignKey
ALTER TABLE `servicelisting` ADD CONSTRAINT `servicelisting_subcategory_id_fkey` FOREIGN KEY (`subcategory_id`) REFERENCES `category`(`category_id`) ON DELETE SET NULL ON UPDATE CASCADE;

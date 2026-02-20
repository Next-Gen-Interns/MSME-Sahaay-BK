-- AlterTable
ALTER TABLE `businessaddress` MODIFY `business_address` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `buyerprofile` MODIFY `address` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `sellerprofile` MODIFY `business_description` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `bio` LONGTEXT NULL,
    MODIFY `address` LONGTEXT NULL;

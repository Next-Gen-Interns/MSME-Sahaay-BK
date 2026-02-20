/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `passwordresetotp` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `passwordresetotp_user_id_key` ON `passwordresetotp`(`user_id`);

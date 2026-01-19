/*
  Warnings:

  - You are about to alter the column `encryptedKey` on the `media` table. The data in that column could be lost. The data in that column will be cast from `LongBlob` to `VarChar(191)`.
  - You are about to alter the column `iv` on the `media` table. The data in that column could be lost. The data in that column will be cast from `LongBlob` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `media` MODIFY `encryptedKey` VARCHAR(191) NOT NULL,
    MODIFY `iv` VARCHAR(191) NOT NULL;

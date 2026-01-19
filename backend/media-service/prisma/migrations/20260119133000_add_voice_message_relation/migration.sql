-- DropForeignKey
ALTER TABLE `thumbnail` DROP FOREIGN KEY `Thumbnail_mediaId_fkey`;

-- DropForeignKey
ALTER TABLE `voicemessage` DROP FOREIGN KEY `VoiceMessage_mediaId_fkey`;

-- DropIndex
DROP INDEX `Thumbnail_mediaId_fkey` ON `thumbnail`;

-- AlterTable
ALTER TABLE `media` MODIFY `iv` LONGBLOB NOT NULL;

-- AddForeignKey
ALTER TABLE `Thumbnail` ADD CONSTRAINT `Thumbnail_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VoiceMessage` ADD CONSTRAINT `VoiceMessage_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

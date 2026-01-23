/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `group` will be added. If there are existing duplicate values, this will fail.
  - The required column `inviteCode` was added to the `group` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `privatemessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `group` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `inviteCode` VARCHAR(191) NOT NULL,
    ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `groupmember` ADD COLUMN `role` ENUM('ADMIN', 'MODERATOR', 'MEMBER') NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE `groupmessage` ADD COLUMN `status` ENUM('SENT', 'DELIVERED', 'READ', 'DELETED') NOT NULL DEFAULT 'SENT';

-- AlterTable
ALTER TABLE `privatemessage` ADD COLUMN `status` ENUM('SENT', 'DELIVERED', 'READ', 'DELETED') NOT NULL DEFAULT 'SENT',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `messagereceipt` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('SENT', 'DELIVERED', 'READ', 'DELETED') NOT NULL DEFAULT 'READ',
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `messagereceipt_messageId_userId_key`(`messageId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messageattachment` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `messageType` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `mediaType` VARCHAR(191) NOT NULL,
    `mediaUrl` VARCHAR(191) NOT NULL,
    `thumbnail` VARCHAR(191) NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messageattachment_messageId_idx`(`messageId`),
    INDEX `messageattachment_mediaId_idx`(`mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messagereaction` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `emoji` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `messagereaction_messageId_userId_emoji_key`(`messageId`, `userId`, `emoji`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voiceplaybackposition` (
    `id` VARCHAR(191) NOT NULL,
    `voiceMessageId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `position` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `voiceplaybackposition_voiceMessageId_key`(`voiceMessageId`),
    UNIQUE INDEX `voiceplaybackposition_voiceMessageId_userId_key`(`voiceMessageId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loginaudit` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `success` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loginaudit_email_idx`(`email`),
    INDEX `loginaudit_ip_idx`(`ip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refreshtoken` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `refreshtoken_token_key`(`token`),
    INDEX `refreshtoken_token_idx`(`token`),
    INDEX `refreshtoken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `profilePic` VARCHAR(191) NULL,
    `provider` ENUM('EMAIL', 'GOOGLE') NOT NULL DEFAULT 'EMAIL',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `lastSeen` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    INDEX `user_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `group_inviteCode_key` ON `group`(`inviteCode`);

-- AddForeignKey
ALTER TABLE `groupmessage` ADD CONSTRAINT `groupmessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messagereaction` ADD CONSTRAINT `messagereaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refreshtoken` ADD CONSTRAINT `refreshtoken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `groupmember` RENAME INDEX `GroupMember_groupId_userId_key` TO `groupmember_groupId_userId_key`;

-- RenameIndex
ALTER TABLE `privatemessage` RENAME INDEX `PrivateMessage_senderId_receiverId_idx` TO `privatemessage_senderId_receiverId_idx`;

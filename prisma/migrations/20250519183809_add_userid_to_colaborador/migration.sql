/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `colaboradores` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `colaboradores` ADD COLUMN `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `colaboradores_userId_key` ON `colaboradores`(`userId`);

-- CreateIndex
CREATE INDEX `colaboradores_userId_idx` ON `colaboradores`(`userId`);

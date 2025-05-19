/*
  Warnings:

  - You are about to drop the column `userId` on the `colaboradores` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `colaboradores_userId_idx` ON `colaboradores`;

-- DropIndex
DROP INDEX `colaboradores_userId_key` ON `colaboradores`;

-- AlterTable
ALTER TABLE `colaboradores` DROP COLUMN `userId`;

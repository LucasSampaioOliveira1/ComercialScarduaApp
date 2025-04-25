/*
  Warnings:

  - You are about to drop the column `numero` on the `colaborador` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `colaborador` DROP COLUMN `numero`,
    ADD COLUMN `numeroCelular` VARCHAR(191) NULL,
    ADD COLUMN `numeroEmergencia` VARCHAR(191) NULL;

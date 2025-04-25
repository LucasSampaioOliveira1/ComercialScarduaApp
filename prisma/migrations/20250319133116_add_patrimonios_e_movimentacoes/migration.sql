/*
  Warnings:

  - You are about to alter the column `token` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `users` MODIFY `token` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `patrimonios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(255) NOT NULL,
    `descricao` TEXT NULL,
    `data_aquisicao` DATETIME(3) NULL,
    `valor` DOUBLE NULL,
    `status` VARCHAR(191) NULL,
    `fabricante` VARCHAR(255) NOT NULL,
    `localizacao` VARCHAR(255) NOT NULL,
    `tipo` VARCHAR(255) NOT NULL,
    `responsavelId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimentacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responsavelId` VARCHAR(191) NOT NULL,
    `patrimonioId` INTEGER NOT NULL,
    `localizacao` VARCHAR(255) NOT NULL,
    `tipo` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

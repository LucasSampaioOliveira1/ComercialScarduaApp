-- AlterTable
ALTER TABLE `colaboradores` ADD COLUMN `empresaId` INTEGER NULL;

-- CreateTable
CREATE TABLE `empresas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` VARCHAR(191) NULL,
    `nomeEmpresa` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `empresas_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `colaboradores_empresaId_idx` ON `colaboradores`(`empresaId`);

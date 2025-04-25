-- AlterTable
ALTER TABLE `empresas` ADD COLUMN `criadoPorId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `empresas_criadoPorId_idx` ON `empresas`(`criadoPorId`);

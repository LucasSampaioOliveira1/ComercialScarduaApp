-- AlterTable
ALTER TABLE `caixaviagem` ADD COLUMN `veiculoId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `CaixaViagem_veiculoId_idx` ON `CaixaViagem`(`veiculoId`);

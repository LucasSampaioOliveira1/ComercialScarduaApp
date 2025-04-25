-- AlterTable
ALTER TABLE `movimentacoes` ADD COLUMN `acao` VARCHAR(255) NULL,
    ADD COLUMN `localizacaoAnterior` VARCHAR(255) NULL,
    ADD COLUMN `responsavelAnteriorId` VARCHAR(191) NULL;

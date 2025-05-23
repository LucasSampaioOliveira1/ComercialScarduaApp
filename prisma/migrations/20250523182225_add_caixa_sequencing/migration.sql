-- AlterTable
ALTER TABLE `caixaviagem` ADD COLUMN `numeroCaixa` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `observacao` VARCHAR(191) NULL,
    ADD COLUMN `saldoAnterior` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `patrimonios` ADD COLUMN `anoModelo` INTEGER NULL,
    ADD COLUMN `dataGarantia` DATETIME(3) NULL,
    ADD COLUMN `dataNotaFiscal` DATETIME(3) NULL,
    ADD COLUMN `dataVencimentoSeguro` DATETIME(3) NULL,
    ADD COLUMN `locado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `numeroNotaFiscal` VARCHAR(255) NULL,
    ADD COLUMN `numeroSerie` VARCHAR(255) NULL,
    ADD COLUMN `placa` VARCHAR(20) NULL,
    ADD COLUMN `proprietario` VARCHAR(255) NULL,
    ADD COLUMN `renavan` VARCHAR(20) NULL,
    ADD COLUMN `segurado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `seguradora` VARCHAR(255) NULL;

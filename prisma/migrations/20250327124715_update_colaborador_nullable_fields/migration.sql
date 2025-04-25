/*
  Warnings:

  - You are about to drop the `colaboradores` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `colaboradores`;

-- CreateTable
CREATE TABLE `Colaborador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NULL,
    `sobrenome` VARCHAR(191) NULL,
    `idade` INTEGER NULL,
    `dataNascimento` DATETIME(3) NULL,
    `numero` VARCHAR(191) NULL,
    `setor` VARCHAR(191) NULL,
    `cargo` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NULL,
    `identidade` VARCHAR(191) NULL,
    `pis` VARCHAR(191) NULL,
    `ctps` VARCHAR(191) NULL,
    `cnhNumero` VARCHAR(191) NULL,
    `cnhVencimento` DATETIME(3) NULL,
    `endereco` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `uf` VARCHAR(191) NULL,
    `banco` VARCHAR(191) NULL,
    `bancoNumero` VARCHAR(191) NULL,
    `contaNumero` VARCHAR(191) NULL,
    `agenciaNumero` VARCHAR(191) NULL,
    `tipoVale` VARCHAR(191) NULL,
    `vt1Valor` DOUBLE NULL,
    `empresaAcess` VARCHAR(191) NULL,
    `empresaRegistro` VARCHAR(191) NULL,
    `empresaTrabalho` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NULL,
    `comissao` DOUBLE NULL,
    `admissao` DATETIME(3) NULL,
    `demissao` DATETIME(3) NULL,
    `oculto` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Colaborador_cpf_key`(`cpf`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

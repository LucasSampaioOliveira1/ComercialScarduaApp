-- CreateTable
CREATE TABLE `conta_corrente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NULL,
    `colaboradorId` INTEGER NULL,
    `data` DATETIME(3) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `fornecedorCliente` VARCHAR(191) NOT NULL,
    `observacao` TEXT NOT NULL,
    `setor` VARCHAR(191) NULL,
    `oculto` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `conta_corrente_empresaId_idx`(`empresaId`),
    INDEX `conta_corrente_colaboradorId_idx`(`colaboradorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lancamentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contaCorrenteId` INTEGER NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `numeroDocumento` VARCHAR(191) NULL,
    `observacao` TEXT NOT NULL,
    `credito` VARCHAR(191) NULL,
    `debito` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `lancamentos_contaCorrenteId_idx`(`contaCorrenteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

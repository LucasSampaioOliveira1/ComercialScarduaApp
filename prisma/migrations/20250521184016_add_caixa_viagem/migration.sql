-- CreateTable
CREATE TABLE `CaixaViagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NULL,
    `funcionarioId` INTEGER NULL,
    `userId` VARCHAR(191) NULL,
    `destino` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `oculto` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CaixaViagem_empresaId_idx`(`empresaId`),
    INDEX `CaixaViagem_funcionarioId_idx`(`funcionarioId`),
    INDEX `CaixaViagem_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ViagemLancamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `caixaViagemId` INTEGER NULL,
    `data` DATETIME(3) NOT NULL,
    `custo` VARCHAR(191) NOT NULL,
    `clienteFornecedor` VARCHAR(191) NOT NULL,
    `entrada` VARCHAR(191) NULL,
    `saida` VARCHAR(191) NULL,
    `numeroDocumento` VARCHAR(191) NULL,
    `historicoDoc` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ViagemLancamento_caixaViagemId_idx`(`caixaViagemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

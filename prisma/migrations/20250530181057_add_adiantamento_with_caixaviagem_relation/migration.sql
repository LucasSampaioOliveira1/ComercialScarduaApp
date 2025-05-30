-- CreateTable
CREATE TABLE `Adiantamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `funcionarioId` INTEGER NULL,
    `data` DATETIME(3) NOT NULL,
    `saida` VARCHAR(191) NOT NULL,
    `observacao` TEXT NULL,
    `oculto` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `empresaId` INTEGER NULL,
    `caixaViagemId` INTEGER NULL,

    INDEX `Adiantamento_funcionarioId_idx`(`funcionarioId`),
    INDEX `Adiantamento_userId_idx`(`userId`),
    INDEX `Adiantamento_empresaId_idx`(`empresaId`),
    INDEX `Adiantamento_caixaViagemId_idx`(`caixaViagemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

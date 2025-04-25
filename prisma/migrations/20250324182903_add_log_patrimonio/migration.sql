-- CreateTable
CREATE TABLE `LogPatrimonio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `acao` VARCHAR(191) NOT NULL,
    `patrimonioId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `detalhes` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

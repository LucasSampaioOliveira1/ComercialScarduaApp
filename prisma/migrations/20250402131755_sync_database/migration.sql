/*
  Warnings:

  - You are about to drop the column `data` on the `movimentacoes` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `movimentacoes_autorId_patrimonioId_idx` ON `movimentacoes`;

-- AlterTable
ALTER TABLE `movimentacoes` DROP COLUMN `data`,
    MODIFY `autorId` INTEGER NULL;

-- AlterTable
ALTER TABLE `patrimonios` ADD COLUMN `franquia` VARCHAR(255) NULL,
    ADD COLUMN `kmEntrega` VARCHAR(191) NULL,
    ADD COLUMN `modelo` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `movimentacoes_patrimonioId_idx` ON `movimentacoes`(`patrimonioId`);

-- CreateIndex
CREATE INDEX `movimentacoes_autorId_idx` ON `movimentacoes`(`autorId`);

-- CreateIndex
CREATE INDEX `movimentacoes_responsavelAnteriorId_idx` ON `movimentacoes`(`responsavelAnteriorId`);

-- CreateIndex
CREATE INDEX `movimentacoes_responsavelNovoId_idx` ON `movimentacoes`(`responsavelNovoId`);

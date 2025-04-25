/*
  Warnings:

  - Added the required column `updatedAt` to the `movimentacoes` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `movimentacoes_responsavelId_idx` ON `movimentacoes`;

-- AlterTable
ALTER TABLE `movimentacoes` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE INDEX `movimentacoes_responsavelId_patrimonioId_idx` ON `movimentacoes`(`responsavelId`, `patrimonioId`);

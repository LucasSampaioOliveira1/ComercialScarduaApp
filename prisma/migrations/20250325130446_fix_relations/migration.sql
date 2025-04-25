/*
  Warnings:

  - You are about to drop the column `acao` on the `movimentacoes` table. All the data in the column will be lost.
  - You are about to drop the column `localizacao` on the `movimentacoes` table. All the data in the column will be lost.
  - You are about to drop the column `responsavelId` on the `movimentacoes` table. All the data in the column will be lost.
  - Added the required column `autorId` to the `movimentacoes` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `movimentacoes_responsavelId_patrimonioId_idx` ON `movimentacoes`;

-- AlterTable
ALTER TABLE `movimentacoes` DROP COLUMN `acao`,
    DROP COLUMN `localizacao`,
    DROP COLUMN `responsavelId`,
    ADD COLUMN `autorId` VARCHAR(191) NOT NULL,
    ADD COLUMN `localizacaoNova` VARCHAR(255) NULL,
    ADD COLUMN `responsavelNovoId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `movimentacoes_autorId_patrimonioId_idx` ON `movimentacoes`(`autorId`, `patrimonioId`);

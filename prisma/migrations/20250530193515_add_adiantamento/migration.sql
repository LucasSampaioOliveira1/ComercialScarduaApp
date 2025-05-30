/*
  Warnings:

  - You are about to drop the column `empresaId` on the `adiantamento` table. All the data in the column will be lost.
  - You are about to drop the column `funcionarioId` on the `adiantamento` table. All the data in the column will be lost.
  - Added the required column `nome` to the `Adiantamento` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Adiantamento_empresaId_idx` ON `adiantamento`;

-- DropIndex
DROP INDEX `Adiantamento_funcionarioId_idx` ON `adiantamento`;

-- AlterTable
ALTER TABLE `adiantamento` DROP COLUMN `empresaId`,
    DROP COLUMN `funcionarioId`,
    ADD COLUMN `colaboradorId` INTEGER NULL,
    ADD COLUMN `nome` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX `Adiantamento_colaboradorId_idx` ON `Adiantamento`(`colaboradorId`);

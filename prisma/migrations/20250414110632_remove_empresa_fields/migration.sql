/*
  Warnings:

  - You are about to drop the column `empresaAcess` on the `colaboradores` table. All the data in the column will be lost.
  - You are about to drop the column `empresaRegistro` on the `colaboradores` table. All the data in the column will be lost.
  - You are about to drop the column `empresaTrabalho` on the `colaboradores` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `colaboradores` DROP COLUMN `empresaAcess`,
    DROP COLUMN `empresaRegistro`,
    DROP COLUMN `empresaTrabalho`;

/*
  Warnings:

  - Added the required column `sobrenome` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `foto` VARCHAR(255) NULL,
    ADD COLUMN `sobrenome` VARCHAR(100) NOT NULL;

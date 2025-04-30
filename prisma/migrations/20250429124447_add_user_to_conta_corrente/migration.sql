-- AlterTable
ALTER TABLE `conta_corrente` ADD COLUMN `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `conta_corrente_userId_idx` ON `conta_corrente`(`userId`);

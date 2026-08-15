-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "reset_token_expires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_reset_token_key" ON "usuarios"("reset_token");

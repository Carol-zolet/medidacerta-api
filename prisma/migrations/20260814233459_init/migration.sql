-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sobrenome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "codigo_acesso" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medidas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "busto" DECIMAL(5,2) NOT NULL,
    "torax" DECIMAL(5,2) NOT NULL,
    "cintura" DECIMAL(5,2) NOT NULL,
    "quadril" DECIMAL(5,2) NOT NULL,
    "coxa" DECIMAL(5,2) NOT NULL,
    "numero_calcado" DECIMAL(3,1) NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_codigo_acesso_key" ON "usuarios"("codigo_acesso");

-- CreateIndex
CREATE UNIQUE INDEX "medidas_usuario_id_key" ON "medidas"("usuario_id");

-- AddForeignKey
ALTER TABLE "medidas" ADD CONSTRAINT "medidas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

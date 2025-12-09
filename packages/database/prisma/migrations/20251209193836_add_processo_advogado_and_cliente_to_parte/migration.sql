-- CreateEnum
CREATE TYPE "PapelAdvogado" AS ENUM ('RESPONSAVEL', 'ASSISTENTE', 'ESTAGIARIO');

-- AlterTable
ALTER TABLE "ParteProcessual" ADD COLUMN     "clienteId" TEXT;

-- CreateTable
CREATE TABLE "ProcessoAdvogado" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "papel" "PapelAdvogado" NOT NULL DEFAULT 'ASSISTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessoAdvogado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessoAdvogado_processoId_idx" ON "ProcessoAdvogado"("processoId");

-- CreateIndex
CREATE INDEX "ProcessoAdvogado_advogadoId_idx" ON "ProcessoAdvogado"("advogadoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessoAdvogado_processoId_advogadoId_key" ON "ProcessoAdvogado"("processoId", "advogadoId");

-- CreateIndex
CREATE INDEX "ParteProcessual_clienteId_idx" ON "ParteProcessual"("clienteId");

-- AddForeignKey
ALTER TABLE "ParteProcessual" ADD CONSTRAINT "ParteProcessual_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoAdvogado" ADD CONSTRAINT "ProcessoAdvogado_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoAdvogado" ADD CONSTRAINT "ProcessoAdvogado_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "Advogado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

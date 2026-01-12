-- CreateEnum
CREATE TYPE "OrigemMovimentacao" AS ENUM ('MANUAL', 'PROJUDI', 'API_CNJ', 'ESAJ', 'PJE');

-- CreateTable
CREATE TABLE "MovimentacaoProcesso" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "sequencial" INTEGER,
    "data" TIMESTAMP(3) NOT NULL,
    "evento" TEXT NOT NULL,
    "descricao" TEXT,
    "movimentadoPor" TEXT,
    "tipoMovimento" TEXT,
    "origem" "OrigemMovimentacao" NOT NULL DEFAULT 'PROJUDI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovimentacaoProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentacaoProcesso_processoId_idx" ON "MovimentacaoProcesso"("processoId");

-- CreateIndex
CREATE INDEX "MovimentacaoProcesso_data_idx" ON "MovimentacaoProcesso"("data");

-- CreateIndex
CREATE INDEX "MovimentacaoProcesso_origem_idx" ON "MovimentacaoProcesso"("origem");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoProcesso_processoId_sequencial_origem_key" ON "MovimentacaoProcesso"("processoId", "sequencial", "origem");

-- AddForeignKey
ALTER TABLE "MovimentacaoProcesso" ADD CONSTRAINT "MovimentacaoProcesso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DocumentoProcesso" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "templateId" TEXT,
    "titulo" TEXT NOT NULL,
    "conteudoHTML" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoProcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoProcesso_processoId_idx" ON "DocumentoProcesso"("processoId");

-- CreateIndex
CREATE INDEX "DocumentoProcesso_clienteId_idx" ON "DocumentoProcesso"("clienteId");

-- CreateIndex
CREATE INDEX "DocumentoProcesso_advogadoId_idx" ON "DocumentoProcesso"("advogadoId");

-- CreateIndex
CREATE INDEX "DocumentoProcesso_createdAt_idx" ON "DocumentoProcesso"("createdAt");

-- AddForeignKey
ALTER TABLE "DocumentoProcesso" ADD CONSTRAINT "DocumentoProcesso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoProcesso" ADD CONSTRAINT "DocumentoProcesso_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoProcesso" ADD CONSTRAINT "DocumentoProcesso_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "Advogado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoProcesso" ADD CONSTRAINT "DocumentoProcesso_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

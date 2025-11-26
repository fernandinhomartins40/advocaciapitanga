-- CreateTable
CREATE TABLE "DocumentoIA" (
    "id" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "processoId" TEXT,
    "tipoPeca" TEXT NOT NULL,
    "contexto" TEXT NOT NULL,
    "fundamentosLegais" TEXT,
    "pedidos" TEXT,
    "partes" TEXT,
    "conteudoGerado" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoIA" (
    "id" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "openaiApiKey" TEXT,
    "modeloGPT" TEXT NOT NULL DEFAULT 'gpt-4',
    "cabecalho" TEXT,
    "rodape" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoIA_advogadoId_idx" ON "DocumentoIA"("advogadoId");

-- CreateIndex
CREATE INDEX "DocumentoIA_clienteId_idx" ON "DocumentoIA"("clienteId");

-- CreateIndex
CREATE INDEX "DocumentoIA_processoId_idx" ON "DocumentoIA"("processoId");

-- CreateIndex
CREATE INDEX "DocumentoIA_createdAt_idx" ON "DocumentoIA"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoIA_advogadoId_key" ON "ConfiguracaoIA"("advogadoId");

-- AddForeignKey
ALTER TABLE "DocumentoIA" ADD CONSTRAINT "DocumentoIA_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "Advogado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoIA" ADD CONSTRAINT "DocumentoIA_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoIA" ADD CONSTRAINT "DocumentoIA_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracaoIA" ADD CONSTRAINT "ConfiguracaoIA_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "Advogado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

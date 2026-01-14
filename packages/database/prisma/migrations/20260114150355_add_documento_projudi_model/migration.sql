-- CreateTable
CREATE TABLE "DocumentoProjudi" (
    "id" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "tipoArquivo" TEXT NOT NULL,
    "assinatura" TEXT,
    "nivelAcesso" TEXT,
    "sequencialMov" INTEGER,
    "dataMov" TEXT,
    "eventoMov" TEXT,
    "caminho" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "versao" TEXT NOT NULL,
    "urlOriginal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoProjudi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoProjudi_consultaId_idx" ON "DocumentoProjudi"("consultaId");

-- CreateIndex
CREATE INDEX "DocumentoProjudi_processoId_idx" ON "DocumentoProjudi"("processoId");

-- CreateIndex
CREATE INDEX "DocumentoProjudi_numeroDocumento_idx" ON "DocumentoProjudi"("numeroDocumento");

-- CreateIndex
CREATE INDEX "DocumentoProjudi_createdAt_idx" ON "DocumentoProjudi"("createdAt");

-- AddForeignKey
ALTER TABLE "DocumentoProjudi" ADD CONSTRAINT "DocumentoProjudi_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "ConsultaProjudi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoProjudi" ADD CONSTRAINT "DocumentoProjudi_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

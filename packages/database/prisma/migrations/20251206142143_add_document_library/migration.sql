-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'EM_REVISAO', 'FINALIZADO', 'ANEXADO');

-- CreateEnum
CREATE TYPE "DocumentAction" AS ENUM ('CRIACAO', 'GERACAO_IA', 'EDICAO', 'STATUS_ATUALIZADO', 'ANEXADO');

-- AlterTable
ALTER TABLE "Documento" ADD COLUMN     "conteudo" TEXT,
ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "templateId" TEXT,
ALTER COLUMN "caminho" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "conteudo" TEXT NOT NULL,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentHistory" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acao" "DocumentAction" NOT NULL,
    "status" "DocumentStatus" NOT NULL,
    "detalhe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentHistory_documentoId_idx" ON "DocumentHistory"("documentoId");

-- CreateIndex
CREATE INDEX "DocumentHistory_processoId_idx" ON "DocumentHistory"("processoId");

-- CreateIndex
CREATE INDEX "DocumentHistory_userId_idx" ON "DocumentHistory"("userId");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

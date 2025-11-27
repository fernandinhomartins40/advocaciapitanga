-- CreateEnum
CREATE TYPE "MetodoConsulta" AS ENUM ('API_OFICIAL', 'SCRAPING_ASSISTIDO');

-- CreateEnum
CREATE TYPE "StatusConsulta" AS ENUM ('SUCESSO', 'ERRO_CAPTCHA', 'ERRO_CONEXAO', 'ERRO_PROCESSO_NAO_ENCONTRADO', 'ERRO_TIMEOUT', 'ERRO_CREDENCIAIS');

-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "descricao" TEXT;

-- CreateTable
CREATE TABLE "ConsultaProjudi" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "metodo" "MetodoConsulta" NOT NULL,
    "status" "StatusConsulta" NOT NULL,
    "dadosExtraidos" JSONB,
    "erroMensagem" TEXT,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultaProjudi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultaProjudi_processoId_idx" ON "ConsultaProjudi"("processoId");

-- CreateIndex
CREATE INDEX "ConsultaProjudi_userId_idx" ON "ConsultaProjudi"("userId");

-- CreateIndex
CREATE INDEX "ConsultaProjudi_createdAt_idx" ON "ConsultaProjudi"("createdAt");

-- CreateIndex
CREATE INDEX "ConsultaProjudi_metodo_idx" ON "ConsultaProjudi"("metodo");

-- AddForeignKey
ALTER TABLE "ConsultaProjudi" ADD CONSTRAINT "ConsultaProjudi_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

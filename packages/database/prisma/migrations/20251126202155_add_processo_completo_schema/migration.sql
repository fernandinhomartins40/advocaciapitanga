-- CreateEnum
CREATE TYPE "Justica" AS ENUM ('ESTADUAL', 'FEDERAL', 'TRABALHO', 'ELEITORAL', 'MILITAR');

-- CreateEnum
CREATE TYPE "Instancia" AS ENUM ('PRIMEIRA', 'SEGUNDA', 'SUPERIOR', 'SUPREMO');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('NORMAL', 'URGENTE', 'MUITO_URGENTE');

-- CreateEnum
CREATE TYPE "TipoParte" AS ENUM ('AUTOR', 'REU', 'TERCEIRO_INTERESSADO', 'ASSISTENTE', 'DENUNCIADO_LIDE', 'CHAMADO_PROCESSO');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL');

-- AlterTable: Migrar descricao para objetoAcao e adicionar novos campos
ALTER TABLE "Processo"
  ADD COLUMN "tipoAcao" TEXT,
  ADD COLUMN "areaDireito" TEXT,
  ADD COLUMN "justica" "Justica",
  ADD COLUMN "instancia" "Instancia",
  ADD COLUMN "comarca" TEXT,
  ADD COLUMN "foro" TEXT,
  ADD COLUMN "vara" TEXT,
  ADD COLUMN "uf" TEXT,
  ADD COLUMN "objetoAcao" TEXT,
  ADD COLUMN "pedidoPrincipal" TEXT,
  ADD COLUMN "valorCausa" DECIMAL(15,2),
  ADD COLUMN "valorHonorarios" DECIMAL(15,2),
  ADD COLUMN "dataDistribuicao" TIMESTAMP(3),
  ADD COLUMN "proximoPrazo" TIMESTAMP(3),
  ADD COLUMN "descricaoPrazo" TEXT,
  ADD COLUMN "prioridade" "Prioridade" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "observacoes" TEXT;

-- Migrar dados existentes: descricao -> objetoAcao
UPDATE "Processo" SET "objetoAcao" = "descricao" WHERE "descricao" IS NOT NULL;

-- Remover coluna antiga
ALTER TABLE "Processo" DROP COLUMN "descricao";

-- CreateTable: ParteProcessual
CREATE TABLE "ParteProcessual" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipoParte" "TipoParte" NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "orgaoEmissor" TEXT,
    "nacionalidade" TEXT DEFAULT 'Brasileiro(a)',
    "estadoCivil" "EstadoCivil",
    "profissao" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "razaoSocial" TEXT,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "inscricaoEstadual" TEXT,
    "representanteLegal" TEXT,
    "cargoRepresentante" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParteProcessual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParteProcessual_processoId_idx" ON "ParteProcessual"("processoId");

-- CreateIndex
CREATE INDEX "ParteProcessual_tipoParte_idx" ON "ParteProcessual"("tipoParte");

-- AddForeignKey
ALTER TABLE "ParteProcessual" ADD CONSTRAINT "ParteProcessual_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

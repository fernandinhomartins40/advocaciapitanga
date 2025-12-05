-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USUARIO_CRIADO';
ALTER TYPE "AuditAction" ADD VALUE 'USUARIO_EDITADO';
ALTER TYPE "AuditAction" ADD VALUE 'USUARIO_DESATIVADO';
ALTER TYPE "AuditAction" ADD VALUE 'USUARIO_ATIVADO';
ALTER TYPE "AuditAction" ADD VALUE 'PERMISSAO_ALTERADA';
ALTER TYPE "AuditAction" ADD VALUE 'ACESSO_NEGADO';
ALTER TYPE "AuditAction" ADD VALUE 'ESCRITORIO_CRIADO';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBRO_ADICIONADO';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBRO_REMOVIDO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'ADMIN_ESCRITORIO';
ALTER TYPE "Role" ADD VALUE 'ASSISTENTE';
ALTER TYPE "Role" ADD VALUE 'ESTAGIARIO';

-- AlterTable
ALTER TABLE "Advogado" ADD COLUMN     "escritorioId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Escritorio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "adminId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escritorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembroEscritorio" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gerenciarUsuarios" BOOLEAN NOT NULL DEFAULT false,
    "gerenciarTodosProcessos" BOOLEAN NOT NULL DEFAULT false,
    "gerenciarProcessosProprios" BOOLEAN NOT NULL DEFAULT true,
    "visualizarOutrosProcessos" BOOLEAN NOT NULL DEFAULT false,
    "gerenciarClientes" BOOLEAN NOT NULL DEFAULT false,
    "visualizarClientes" BOOLEAN NOT NULL DEFAULT true,
    "gerenciarIA" BOOLEAN NOT NULL DEFAULT false,
    "configurarSistema" BOOLEAN NOT NULL DEFAULT false,
    "visualizarRelatorios" BOOLEAN NOT NULL DEFAULT false,
    "exportarDados" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataConvite" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAceitacao" TIMESTAMP(3),
    "convidadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembroEscritorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escritorio_cnpj_key" ON "Escritorio"("cnpj");

-- CreateIndex
CREATE INDEX "Escritorio_adminId_idx" ON "Escritorio"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "MembroEscritorio_userId_key" ON "MembroEscritorio"("userId");

-- CreateIndex
CREATE INDEX "MembroEscritorio_escritorioId_idx" ON "MembroEscritorio"("escritorioId");

-- CreateIndex
CREATE INDEX "MembroEscritorio_userId_idx" ON "MembroEscritorio"("userId");

-- AddForeignKey
ALTER TABLE "Advogado" ADD CONSTRAINT "Advogado_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escritorio" ADD CONSTRAINT "Escritorio_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Advogado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroEscritorio" ADD CONSTRAINT "MembroEscritorio_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembroEscritorio" ADD CONSTRAINT "MembroEscritorio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

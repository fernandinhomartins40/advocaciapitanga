/*
  Warnings:

  - You are about to drop the `MovimentacaoProcesso` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MovimentacaoProcesso" DROP CONSTRAINT "MovimentacaoProcesso_processoId_fkey";

-- AlterTable
ALTER TABLE "ConsultaProjudi" ADD COLUMN     "movimentacoes" JSONB;

-- DropTable
DROP TABLE "MovimentacaoProcesso";

-- DropEnum
DROP TYPE "OrigemMovimentacao";

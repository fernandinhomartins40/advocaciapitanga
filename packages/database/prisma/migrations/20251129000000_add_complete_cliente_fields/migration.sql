-- AlterTable: Add TipoPessoa enum and complete Cliente fields
-- Step 1: Add new columns with default values

-- Add tipoPessoa (default FISICA)
ALTER TABLE "Cliente" ADD COLUMN "tipoPessoa" "TipoPessoa" NOT NULL DEFAULT 'FISICA';

-- Pessoa Física fields (cpf já existe, apenas alterar para nullable)
ALTER TABLE "Cliente" ALTER COLUMN "cpf" DROP NOT NULL;
ALTER TABLE "Cliente" ADD COLUMN "rg" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "orgaoEmissor" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "nacionalidade" TEXT DEFAULT 'Brasileiro(a)';
ALTER TABLE "Cliente" ADD COLUMN "estadoCivil" "EstadoCivil";
ALTER TABLE "Cliente" ADD COLUMN "profissao" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "dataNascimento" TIMESTAMP(3);

-- Pessoa Jurídica fields
ALTER TABLE "Cliente" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "razaoSocial" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "nomeFantasia" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "inscricaoEstadual" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "representanteLegal" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "cargoRepresentante" TEXT;

-- Contato (telefone já existe, adicionar celular)
ALTER TABLE "Cliente" ADD COLUMN "celular" TEXT;

-- Endereço completo (migrar dados do campo antigo 'endereco' antes de dropar)
ALTER TABLE "Cliente" ADD COLUMN "cep" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "logradouro" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "numero" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "complemento" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "bairro" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "cidade" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "uf" TEXT;

-- Migrar dados antigos de 'endereco' para 'logradouro' (se existir valor)
UPDATE "Cliente" SET "logradouro" = "endereco" WHERE "endereco" IS NOT NULL;

-- Dropar coluna antiga de endereço
ALTER TABLE "Cliente" DROP COLUMN "endereco";

-- Step 2: Add unique constraints
CREATE UNIQUE INDEX "Cliente_cnpj_key" ON "Cliente"("cnpj");

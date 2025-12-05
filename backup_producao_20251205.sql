--
-- PostgreSQL database dump
--

\restrict 1059q1U9QU1vCLQq853gtIk06XwCHhgqGH6EPg9O1nzrTDgvTsagI5O2jvuw2Ug

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."Processo" DROP CONSTRAINT IF EXISTS "Processo_clienteId_fkey";
ALTER TABLE IF EXISTS ONLY public."Processo" DROP CONSTRAINT IF EXISTS "Processo_advogadoId_fkey";
ALTER TABLE IF EXISTS ONLY public."ParteProcessual" DROP CONSTRAINT IF EXISTS "ParteProcessual_processoId_fkey";
ALTER TABLE IF EXISTS ONLY public."Mensagem" DROP CONSTRAINT IF EXISTS "Mensagem_processoId_fkey";
ALTER TABLE IF EXISTS ONLY public."MembroEscritorio" DROP CONSTRAINT IF EXISTS "MembroEscritorio_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."MembroEscritorio" DROP CONSTRAINT IF EXISTS "MembroEscritorio_escritorioId_fkey";
ALTER TABLE IF EXISTS ONLY public."Escritorio" DROP CONSTRAINT IF EXISTS "Escritorio_adminId_fkey";
ALTER TABLE IF EXISTS ONLY public."Documento" DROP CONSTRAINT IF EXISTS "Documento_processoId_fkey";
ALTER TABLE IF EXISTS ONLY public."DocumentoIA" DROP CONSTRAINT IF EXISTS "DocumentoIA_processoId_fkey";
ALTER TABLE IF EXISTS ONLY public."DocumentoIA" DROP CONSTRAINT IF EXISTS "DocumentoIA_clienteId_fkey";
ALTER TABLE IF EXISTS ONLY public."DocumentoIA" DROP CONSTRAINT IF EXISTS "DocumentoIA_advogadoId_fkey";
ALTER TABLE IF EXISTS ONLY public."ConsultaProjudi" DROP CONSTRAINT IF EXISTS "ConsultaProjudi_processoId_fkey";
ALTER TABLE IF EXISTS ONLY public."ConfiguracaoIA" DROP CONSTRAINT IF EXISTS "ConfiguracaoIA_advogadoId_fkey";
ALTER TABLE IF EXISTS ONLY public."Cliente" DROP CONSTRAINT IF EXISTS "Cliente_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Advogado" DROP CONSTRAINT IF EXISTS "Advogado_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Advogado" DROP CONSTRAINT IF EXISTS "Advogado_escritorioId_fkey";
DROP INDEX IF EXISTS public."User_email_key";
DROP INDEX IF EXISTS public."Processo_numero_key";
DROP INDEX IF EXISTS public."ParteProcessual_tipoParte_idx";
DROP INDEX IF EXISTS public."ParteProcessual_processoId_idx";
DROP INDEX IF EXISTS public."MembroEscritorio_userId_key";
DROP INDEX IF EXISTS public."MembroEscritorio_userId_idx";
DROP INDEX IF EXISTS public."MembroEscritorio_escritorioId_idx";
DROP INDEX IF EXISTS public."Escritorio_cnpj_key";
DROP INDEX IF EXISTS public."Escritorio_adminId_idx";
DROP INDEX IF EXISTS public."DocumentoIA_processoId_idx";
DROP INDEX IF EXISTS public."DocumentoIA_createdAt_idx";
DROP INDEX IF EXISTS public."DocumentoIA_clienteId_idx";
DROP INDEX IF EXISTS public."DocumentoIA_advogadoId_idx";
DROP INDEX IF EXISTS public."ConsultaProjudi_userId_idx";
DROP INDEX IF EXISTS public."ConsultaProjudi_processoId_idx";
DROP INDEX IF EXISTS public."ConsultaProjudi_metodo_idx";
DROP INDEX IF EXISTS public."ConsultaProjudi_createdAt_idx";
DROP INDEX IF EXISTS public."ConfiguracaoIA_advogadoId_key";
DROP INDEX IF EXISTS public."Cliente_userId_key";
DROP INDEX IF EXISTS public."Cliente_cpf_key";
DROP INDEX IF EXISTS public."Cliente_cnpj_key";
DROP INDEX IF EXISTS public."AuditLog_userId_idx";
DROP INDEX IF EXISTS public."AuditLog_createdAt_idx";
DROP INDEX IF EXISTS public."AuditLog_action_idx";
DROP INDEX IF EXISTS public."Advogado_userId_key";
DROP INDEX IF EXISTS public."Advogado_oab_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."Processo" DROP CONSTRAINT IF EXISTS "Processo_pkey";
ALTER TABLE IF EXISTS ONLY public."ParteProcessual" DROP CONSTRAINT IF EXISTS "ParteProcessual_pkey";
ALTER TABLE IF EXISTS ONLY public."Mensagem" DROP CONSTRAINT IF EXISTS "Mensagem_pkey";
ALTER TABLE IF EXISTS ONLY public."MembroEscritorio" DROP CONSTRAINT IF EXISTS "MembroEscritorio_pkey";
ALTER TABLE IF EXISTS ONLY public."Escritorio" DROP CONSTRAINT IF EXISTS "Escritorio_pkey";
ALTER TABLE IF EXISTS ONLY public."Documento" DROP CONSTRAINT IF EXISTS "Documento_pkey";
ALTER TABLE IF EXISTS ONLY public."DocumentoIA" DROP CONSTRAINT IF EXISTS "DocumentoIA_pkey";
ALTER TABLE IF EXISTS ONLY public."ConsultaProjudi" DROP CONSTRAINT IF EXISTS "ConsultaProjudi_pkey";
ALTER TABLE IF EXISTS ONLY public."ConfiguracaoIA" DROP CONSTRAINT IF EXISTS "ConfiguracaoIA_pkey";
ALTER TABLE IF EXISTS ONLY public."Cliente" DROP CONSTRAINT IF EXISTS "Cliente_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
ALTER TABLE IF EXISTS ONLY public."Advogado" DROP CONSTRAINT IF EXISTS "Advogado_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."Processo";
DROP TABLE IF EXISTS public."ParteProcessual";
DROP TABLE IF EXISTS public."Mensagem";
DROP TABLE IF EXISTS public."MembroEscritorio";
DROP TABLE IF EXISTS public."Escritorio";
DROP TABLE IF EXISTS public."DocumentoIA";
DROP TABLE IF EXISTS public."Documento";
DROP TABLE IF EXISTS public."ConsultaProjudi";
DROP TABLE IF EXISTS public."ConfiguracaoIA";
DROP TABLE IF EXISTS public."Cliente";
DROP TABLE IF EXISTS public."AuditLog";
DROP TABLE IF EXISTS public."Advogado";
DROP TYPE IF EXISTS public."TipoPessoa";
DROP TYPE IF EXISTS public."TipoParte";
DROP TYPE IF EXISTS public."StatusProcesso";
DROP TYPE IF EXISTS public."StatusConsulta";
DROP TYPE IF EXISTS public."Role";
DROP TYPE IF EXISTS public."Prioridade";
DROP TYPE IF EXISTS public."MetodoConsulta";
DROP TYPE IF EXISTS public."Justica";
DROP TYPE IF EXISTS public."Instancia";
DROP TYPE IF EXISTS public."EstadoCivil";
DROP TYPE IF EXISTS public."AuditAction";
--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."AuditAction" AS ENUM (
    'EMAIL_UPDATED',
    'PASSWORD_UPDATED',
    'PROFILE_UPDATED',
    'LOGIN',
    'LOGOUT',
    'FAILED_LOGIN',
    'USUARIO_CRIADO',
    'USUARIO_EDITADO',
    'USUARIO_DESATIVADO',
    'USUARIO_ATIVADO',
    'PERMISSAO_ALTERADA',
    'ACESSO_NEGADO',
    'ESCRITORIO_CRIADO',
    'MEMBRO_ADICIONADO',
    'MEMBRO_REMOVIDO'
);


ALTER TYPE public."AuditAction" OWNER TO advocacia;

--
-- Name: EstadoCivil; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."EstadoCivil" AS ENUM (
    'SOLTEIRO',
    'CASADO',
    'DIVORCIADO',
    'VIUVO',
    'UNIAO_ESTAVEL'
);


ALTER TYPE public."EstadoCivil" OWNER TO advocacia;

--
-- Name: Instancia; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."Instancia" AS ENUM (
    'PRIMEIRA',
    'SEGUNDA',
    'SUPERIOR',
    'SUPREMO'
);


ALTER TYPE public."Instancia" OWNER TO advocacia;

--
-- Name: Justica; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."Justica" AS ENUM (
    'ESTADUAL',
    'FEDERAL',
    'TRABALHO',
    'ELEITORAL',
    'MILITAR'
);


ALTER TYPE public."Justica" OWNER TO advocacia;

--
-- Name: MetodoConsulta; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."MetodoConsulta" AS ENUM (
    'API_OFICIAL',
    'SCRAPING_ASSISTIDO'
);


ALTER TYPE public."MetodoConsulta" OWNER TO advocacia;

--
-- Name: Prioridade; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."Prioridade" AS ENUM (
    'NORMAL',
    'URGENTE',
    'MUITO_URGENTE'
);


ALTER TYPE public."Prioridade" OWNER TO advocacia;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."Role" AS ENUM (
    'ADVOGADO',
    'CLIENTE',
    'ADMIN_ESCRITORIO',
    'ASSISTENTE',
    'ESTAGIARIO'
);


ALTER TYPE public."Role" OWNER TO advocacia;

--
-- Name: StatusConsulta; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."StatusConsulta" AS ENUM (
    'SUCESSO',
    'ERRO_CAPTCHA',
    'ERRO_CONEXAO',
    'ERRO_PROCESSO_NAO_ENCONTRADO',
    'ERRO_TIMEOUT',
    'ERRO_CREDENCIAIS'
);


ALTER TYPE public."StatusConsulta" OWNER TO advocacia;

--
-- Name: StatusProcesso; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."StatusProcesso" AS ENUM (
    'EM_ANDAMENTO',
    'SUSPENSO',
    'CONCLUIDO',
    'ARQUIVADO'
);


ALTER TYPE public."StatusProcesso" OWNER TO advocacia;

--
-- Name: TipoParte; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."TipoParte" AS ENUM (
    'AUTOR',
    'REU',
    'TERCEIRO_INTERESSADO',
    'ASSISTENTE',
    'DENUNCIADO_LIDE',
    'CHAMADO_PROCESSO'
);


ALTER TYPE public."TipoParte" OWNER TO advocacia;

--
-- Name: TipoPessoa; Type: TYPE; Schema: public; Owner: advocacia
--

CREATE TYPE public."TipoPessoa" AS ENUM (
    'FISICA',
    'JURIDICA'
);


ALTER TYPE public."TipoPessoa" OWNER TO advocacia;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Advogado; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."Advogado" (
    id text NOT NULL,
    "userId" text NOT NULL,
    oab text NOT NULL,
    telefone text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "escritorioId" text
);


ALTER TABLE public."Advogado" OWNER TO advocacia;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    action public."AuditAction" NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    "oldValue" text,
    "newValue" text,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO advocacia;

--
-- Name: Cliente; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."Cliente" (
    id text NOT NULL,
    "userId" text NOT NULL,
    cpf text,
    telefone text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tipoPessoa" public."TipoPessoa" DEFAULT 'FISICA'::public."TipoPessoa" NOT NULL,
    rg text,
    "orgaoEmissor" text,
    nacionalidade text DEFAULT 'Brasileiro(a)'::text,
    "estadoCivil" public."EstadoCivil",
    profissao text,
    "dataNascimento" timestamp(3) without time zone,
    cnpj text,
    "razaoSocial" text,
    "nomeFantasia" text,
    "inscricaoEstadual" text,
    "representanteLegal" text,
    "cargoRepresentante" text,
    celular text,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    uf text
);


ALTER TABLE public."Cliente" OWNER TO advocacia;

--
-- Name: ConfiguracaoIA; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."ConfiguracaoIA" (
    id text NOT NULL,
    "advogadoId" text NOT NULL,
    "openaiApiKey" text,
    "modeloGPT" text DEFAULT 'gpt-4'::text NOT NULL,
    cabecalho text,
    rodape text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ConfiguracaoIA" OWNER TO advocacia;

--
-- Name: ConsultaProjudi; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."ConsultaProjudi" (
    id text NOT NULL,
    "processoId" text NOT NULL,
    metodo public."MetodoConsulta" NOT NULL,
    status public."StatusConsulta" NOT NULL,
    "dadosExtraidos" jsonb,
    "erroMensagem" text,
    "userId" text NOT NULL,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ConsultaProjudi" OWNER TO advocacia;

--
-- Name: Documento; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."Documento" (
    id text NOT NULL,
    titulo text NOT NULL,
    caminho text NOT NULL,
    tipo text NOT NULL,
    tamanho integer NOT NULL,
    "processoId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Documento" OWNER TO advocacia;

--
-- Name: DocumentoIA; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."DocumentoIA" (
    id text NOT NULL,
    "advogadoId" text NOT NULL,
    "clienteId" text,
    "processoId" text,
    "tipoPeca" text NOT NULL,
    contexto text NOT NULL,
    "fundamentosLegais" text,
    pedidos text,
    partes text,
    "conteudoGerado" text NOT NULL,
    titulo text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DocumentoIA" OWNER TO advocacia;

--
-- Name: Escritorio; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."Escritorio" (
    id text NOT NULL,
    nome text NOT NULL,
    cnpj text,
    "adminId" text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Escritorio" OWNER TO advocacia;

--
-- Name: MembroEscritorio; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."MembroEscritorio" (
    id text NOT NULL,
    "escritorioId" text NOT NULL,
    "userId" text NOT NULL,
    "gerenciarUsuarios" boolean DEFAULT false NOT NULL,
    "gerenciarTodosProcessos" boolean DEFAULT false NOT NULL,
    "gerenciarProcessosProprios" boolean DEFAULT true NOT NULL,
    "visualizarOutrosProcessos" boolean DEFAULT false NOT NULL,
    "gerenciarClientes" boolean DEFAULT false NOT NULL,
    "visualizarClientes" boolean DEFAULT true NOT NULL,
    "gerenciarIA" boolean DEFAULT false NOT NULL,
    "configurarSistema" boolean DEFAULT false NOT NULL,
    "visualizarRelatorios" boolean DEFAULT false NOT NULL,
    "exportarDados" boolean DEFAULT false NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    "dataConvite" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dataAceitacao" timestamp(3) without time zone,
    "convidadoPor" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MembroEscritorio" OWNER TO advocacia;

--
-- Name: Mensagem; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."Mensagem" (
    id text NOT NULL,
    conteudo text NOT NULL,
    "processoId" text NOT NULL,
    remetente text NOT NULL,
    lida boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Mensagem" OWNER TO advocacia;

--
-- Name: ParteProcessual; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."ParteProcessual" (
    id text NOT NULL,
    "processoId" text NOT NULL,
    "tipoParte" public."TipoParte" NOT NULL,
    "tipoPessoa" public."TipoPessoa" NOT NULL,
    "nomeCompleto" text NOT NULL,
    cpf text,
    rg text,
    "orgaoEmissor" text,
    nacionalidade text DEFAULT 'Brasileiro(a)'::text,
    "estadoCivil" public."EstadoCivil",
    profissao text,
    "dataNascimento" timestamp(3) without time zone,
    "razaoSocial" text,
    "nomeFantasia" text,
    cnpj text,
    "inscricaoEstadual" text,
    "representanteLegal" text,
    "cargoRepresentante" text,
    email text,
    telefone text,
    celular text,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    uf text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ParteProcessual" OWNER TO advocacia;

--
-- Name: Processo; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."Processo" (
    id text NOT NULL,
    numero text NOT NULL,
    "clienteId" text NOT NULL,
    "advogadoId" text NOT NULL,
    status public."StatusProcesso" DEFAULT 'EM_ANDAMENTO'::public."StatusProcesso" NOT NULL,
    "dataInicio" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "tipoAcao" text,
    "areaDireito" text,
    justica public."Justica",
    instancia public."Instancia",
    comarca text,
    foro text,
    vara text,
    uf text,
    "objetoAcao" text,
    "pedidoPrincipal" text,
    "valorCausa" numeric(15,2),
    "valorHonorarios" numeric(15,2),
    "dataDistribuicao" timestamp(3) without time zone,
    "proximoPrazo" timestamp(3) without time zone,
    "descricaoPrazo" text,
    prioridade public."Prioridade" DEFAULT 'NORMAL'::public."Prioridade" NOT NULL,
    observacoes text,
    descricao text
);


ALTER TABLE public."Processo" OWNER TO advocacia;

--
-- Name: User; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'CLIENTE'::public."Role" NOT NULL,
    nome text NOT NULL,
    "refreshToken" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    ativo boolean DEFAULT true NOT NULL
);


ALTER TABLE public."User" OWNER TO advocacia;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: advocacia
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO advocacia;

--
-- Data for Name: Advogado; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."Advogado" (id, "userId", oab, telefone, "createdAt", "updatedAt", "escritorioId") FROM stdin;
cmitf5ti000014h751ivtpb8k	cmitf5thz00004h75njyudmqq	SP123456	(11) 98765-4321	2025-12-05 22:11:17.015	2025-12-05 22:11:17.026	cmitf5ti700034h75icuaqivs
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."AuditLog" (id, "userId", action, "entityType", "entityId", "oldValue", "newValue", "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: Cliente; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."Cliente" (id, "userId", cpf, telefone, "createdAt", "updatedAt", "tipoPessoa", rg, "orgaoEmissor", nacionalidade, "estadoCivil", profissao, "dataNascimento", cnpj, "razaoSocial", "nomeFantasia", "inscricaoEstadual", "representanteLegal", "cargoRepresentante", celular, cep, logradouro, numero, complemento, bairro, cidade, uf) FROM stdin;
cmitf5tid00054h75mjiodkkv	cmitf5tid00044h750tszxcn9	123.456.789-00	(11) 91234-5678	2025-12-05 22:11:17.029	2025-12-05 22:11:17.029	FISICA	\N	\N	Brasileiro(a)	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	01234-567	Rua das Flores	123	\N	Centro	São Paulo	SP
cmitf5tit00074h75eln6bh3w	cmitf5tit00064h753y5lmfe8	987.654.321-00	(11) 92345-6789	2025-12-05 22:11:17.045	2025-12-05 22:11:17.045	FISICA	\N	\N	Brasileiro(a)	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	01310-100	Av. Paulista	1000	\N	Bela Vista	São Paulo	SP
\.


--
-- Data for Name: ConfiguracaoIA; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."ConfiguracaoIA" (id, "advogadoId", "openaiApiKey", "modeloGPT", cabecalho, rodape, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ConsultaProjudi; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."ConsultaProjudi" (id, "processoId", metodo, status, "dadosExtraidos", "erroMensagem", "userId", "ipAddress", "createdAt") FROM stdin;
\.


--
-- Data for Name: Documento; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."Documento" (id, titulo, caminho, tipo, tamanho, "processoId", "createdAt") FROM stdin;
\.


--
-- Data for Name: DocumentoIA; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."DocumentoIA" (id, "advogadoId", "clienteId", "processoId", "tipoPeca", contexto, "fundamentosLegais", pedidos, partes, "conteudoGerado", titulo, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Escritorio; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."Escritorio" (id, nome, cnpj, "adminId", ativo, "createdAt", "updatedAt") FROM stdin;
cmitf5ti700034h75icuaqivs	Escritório Pitanga & Advocacia	\N	cmitf5ti000014h751ivtpb8k	t	2025-12-05 22:11:17.023	2025-12-05 22:11:17.023
\.


--
-- Data for Name: MembroEscritorio; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."MembroEscritorio" (id, "escritorioId", "userId", "gerenciarUsuarios", "gerenciarTodosProcessos", "gerenciarProcessosProprios", "visualizarOutrosProcessos", "gerenciarClientes", "visualizarClientes", "gerenciarIA", "configurarSistema", "visualizarRelatorios", "exportarDados", ativo, "dataConvite", "dataAceitacao", "convidadoPor", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Mensagem; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."Mensagem" (id, conteudo, "processoId", remetente, lida, "createdAt") FROM stdin;
cmitf5tja000f4h75u91x65ir	Olá, gostaria de saber o andamento do meu processo.	cmitf5tiy00094h75fpiqe4xg	Cliente	f	2025-12-05 22:11:17.063
cmitf5tjd000h4h75o5bcpahi	Olá Maria, o processo está em andamento. Estamos aguardando a resposta da outra parte. Assim que houver novidades, entrarei em contato.	cmitf5tiy00094h75fpiqe4xg	Advogado	t	2025-12-05 22:11:17.065
cmitf5tjf000j4h750op7lqch	Perfeito, obrigada pela atenção!	cmitf5tiy00094h75fpiqe4xg	Cliente	t	2025-12-05 22:11:17.067
cmitf5tjh000l4h75n5sq1tn0	Dr. João, preciso de uma cópia do contrato. Pode me enviar?	cmitf5tj3000b4h75ixg9i8h8	Cliente	f	2025-12-05 22:11:17.07
\.


--
-- Data for Name: ParteProcessual; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."ParteProcessual" (id, "processoId", "tipoParte", "tipoPessoa", "nomeCompleto", cpf, rg, "orgaoEmissor", nacionalidade, "estadoCivil", profissao, "dataNascimento", "razaoSocial", "nomeFantasia", cnpj, "inscricaoEstadual", "representanteLegal", "cargoRepresentante", email, telefone, celular, cep, logradouro, numero, complemento, bairro, cidade, uf, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Processo; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."Processo" (id, numero, "clienteId", "advogadoId", status, "dataInicio", "createdAt", "updatedAt", "tipoAcao", "areaDireito", justica, instancia, comarca, foro, vara, uf, "objetoAcao", "pedidoPrincipal", "valorCausa", "valorHonorarios", "dataDistribuicao", "proximoPrazo", "descricaoPrazo", prioridade, observacoes, descricao) FROM stdin;
cmitf5tiy00094h75fpiqe4xg	1234567-89.2024.8.26.0100	cmitf5tid00054h75mjiodkkv	cmitf5ti000014h751ivtpb8k	EM_ANDAMENTO	2025-12-05 22:11:17.05	2025-12-05 22:11:17.05	2025-12-05 22:11:17.05	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NORMAL	\N	Ação de indenização por danos morais decorrente de acidente de trânsito
cmitf5tj3000b4h75ixg9i8h8	9876543-21.2024.8.26.0200	cmitf5tit00074h75eln6bh3w	cmitf5ti000014h751ivtpb8k	EM_ANDAMENTO	2025-12-05 22:11:17.055	2025-12-05 22:11:17.055	2025-12-05 22:11:17.055	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NORMAL	\N	Revisão de contrato trabalhista com pedido de verbas rescisórias
cmitf5tj6000d4h75dg2df8ex	5555555-55.2024.8.26.0300	cmitf5tid00054h75mjiodkkv	cmitf5ti000014h751ivtpb8k	CONCLUIDO	2025-12-05 22:11:17.058	2025-12-05 22:11:17.058	2025-12-05 22:11:17.058	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	NORMAL	\N	Ação de divórcio consensual com partilha de bens
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public."User" (id, email, password, role, nome, "refreshToken", "createdAt", "updatedAt", ativo) FROM stdin;
cmitf5tit00064h753y5lmfe8	jose@email.com	$2a$10$J0TIRuq0aFXXnRWGj2rz2OuJ6IDRKavFzppomU6NdpOPIq9MLlzQ2	CLIENTE	José Oliveira	\N	2025-12-05 22:11:17.045	2025-12-05 22:11:17.045	t
cmitf5thz00004h75njyudmqq	admin@pitanga.com	$2a$10$mYGGV5mux/rWnUZVKgwiSO0ejEmBHQ3MtcSChRnXXucxxFu/vabv6	ADMIN_ESCRITORIO	Dr. João Silva	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWl0ZjV0aHowMDAwNGg3NW5qeXVkbXFxIiwiZW1haWwiOiJhZG1pbkBwaXRhbmdhLmNvbSIsInJvbGUiOiJBRE1JTl9FU0NSSVRPUklPIiwiaWF0IjoxNzY0OTcyODQxLCJleHAiOjE3NjU1Nzc2NDF9.ifkHPdbffS4BagbZHGkZqIdOFTeIyBHcSxERq_uaWjM	2025-12-05 22:11:17.015	2025-12-05 22:14:01.837	t
cmitf5tid00044h750tszxcn9	maria@email.com	$2a$10$J0TIRuq0aFXXnRWGj2rz2OuJ6IDRKavFzppomU6NdpOPIq9MLlzQ2	CLIENTE	Maria Santos	\N	2025-12-05 22:11:17.029	2025-12-05 22:11:17.029	t
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: advocacia
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
e6b55a54-f3a2-420f-b1c2-94c1af8d3ca8	cb74ed016ae93af2477988d88e4d2ff5520dd15d0885340afadfde026cf04bb6	2025-11-26 12:47:59.560902+00	20251126123943_init	\N	\N	2025-11-26 12:47:59.4564+00	1
ec451bc8-e02f-4b9a-8272-087e82cb6df2	652c470afdf3c05dbdf7c446e9d719b8d91b76fb87acba662e1002f9a2870390	2025-11-26 15:03:03.35078+00	20251126141619_add_audit_log	\N	\N	2025-11-26 15:03:03.256702+00	1
5f019888-9d75-4a2c-b19f-42c68682ab95	63b53953d63bfc14e85d83ba57c9b68769a7c62e6e20e75edffae6c18d5fba45	2025-11-26 15:27:42.486819+00	20251126145329_add_ia_tables	\N	\N	2025-11-26 15:27:42.401903+00	1
37b81c4c-7f89-4443-9faa-a415ed66ffea	7cd7ef0bf7cd5c1dad96f2195d410d6d9899390f8f5330db565461b6c128feec	2025-11-26 23:48:28.458654+00	20251126202155_add_processo_completo_schema	\N	\N	2025-11-26 23:48:28.389388+00	1
c95bebb0-7b68-4bc6-9886-9291e7c986f4	806d85db1543271c7f35bd41beb01e798fdf3f0a95ad7fd5760297dcae51ab8f	2025-11-27 15:47:54.64722+00	20251127144848_add_consulta_projudi_table	\N	\N	2025-11-27 15:47:54.5904+00	1
fbccd38e-e523-4387-9371-0d4b8fac962b	03e76c456368c42f059260c11011649b72a4805740bcb2d42cbbaacd7f44fea0	2025-11-29 15:53:18.003495+00	20251129000000_add_complete_cliente_fields	\N	\N	2025-11-29 15:53:17.973213+00	1
9a6c8b67-cedb-48d7-8d54-8d1a0431a471	a408bfeff42f85ec1bec77a1fb13edadd46c8bb13485083b3cac305bb5abc88b	2025-12-05 19:01:58.604865+00	20251205181306_add_escritorio_sistema_permissoes	\N	\N	2025-12-05 19:01:58.525222+00	1
\.


--
-- Name: Advogado Advogado_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Advogado"
    ADD CONSTRAINT "Advogado_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Cliente Cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Cliente"
    ADD CONSTRAINT "Cliente_pkey" PRIMARY KEY (id);


--
-- Name: ConfiguracaoIA ConfiguracaoIA_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."ConfiguracaoIA"
    ADD CONSTRAINT "ConfiguracaoIA_pkey" PRIMARY KEY (id);


--
-- Name: ConsultaProjudi ConsultaProjudi_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."ConsultaProjudi"
    ADD CONSTRAINT "ConsultaProjudi_pkey" PRIMARY KEY (id);


--
-- Name: DocumentoIA DocumentoIA_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."DocumentoIA"
    ADD CONSTRAINT "DocumentoIA_pkey" PRIMARY KEY (id);


--
-- Name: Documento Documento_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Documento"
    ADD CONSTRAINT "Documento_pkey" PRIMARY KEY (id);


--
-- Name: Escritorio Escritorio_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Escritorio"
    ADD CONSTRAINT "Escritorio_pkey" PRIMARY KEY (id);


--
-- Name: MembroEscritorio MembroEscritorio_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."MembroEscritorio"
    ADD CONSTRAINT "MembroEscritorio_pkey" PRIMARY KEY (id);


--
-- Name: Mensagem Mensagem_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Mensagem"
    ADD CONSTRAINT "Mensagem_pkey" PRIMARY KEY (id);


--
-- Name: ParteProcessual ParteProcessual_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."ParteProcessual"
    ADD CONSTRAINT "ParteProcessual_pkey" PRIMARY KEY (id);


--
-- Name: Processo Processo_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Processo"
    ADD CONSTRAINT "Processo_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Advogado_oab_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "Advogado_oab_key" ON public."Advogado" USING btree (oab);


--
-- Name: Advogado_userId_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "Advogado_userId_key" ON public."Advogado" USING btree ("userId");


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: Cliente_cnpj_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "Cliente_cnpj_key" ON public."Cliente" USING btree (cnpj);


--
-- Name: Cliente_cpf_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "Cliente_cpf_key" ON public."Cliente" USING btree (cpf);


--
-- Name: Cliente_userId_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "Cliente_userId_key" ON public."Cliente" USING btree ("userId");


--
-- Name: ConfiguracaoIA_advogadoId_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "ConfiguracaoIA_advogadoId_key" ON public."ConfiguracaoIA" USING btree ("advogadoId");


--
-- Name: ConsultaProjudi_createdAt_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "ConsultaProjudi_createdAt_idx" ON public."ConsultaProjudi" USING btree ("createdAt");


--
-- Name: ConsultaProjudi_metodo_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "ConsultaProjudi_metodo_idx" ON public."ConsultaProjudi" USING btree (metodo);


--
-- Name: ConsultaProjudi_processoId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "ConsultaProjudi_processoId_idx" ON public."ConsultaProjudi" USING btree ("processoId");


--
-- Name: ConsultaProjudi_userId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "ConsultaProjudi_userId_idx" ON public."ConsultaProjudi" USING btree ("userId");


--
-- Name: DocumentoIA_advogadoId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "DocumentoIA_advogadoId_idx" ON public."DocumentoIA" USING btree ("advogadoId");


--
-- Name: DocumentoIA_clienteId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "DocumentoIA_clienteId_idx" ON public."DocumentoIA" USING btree ("clienteId");


--
-- Name: DocumentoIA_createdAt_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "DocumentoIA_createdAt_idx" ON public."DocumentoIA" USING btree ("createdAt");


--
-- Name: DocumentoIA_processoId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "DocumentoIA_processoId_idx" ON public."DocumentoIA" USING btree ("processoId");


--
-- Name: Escritorio_adminId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "Escritorio_adminId_idx" ON public."Escritorio" USING btree ("adminId");


--
-- Name: Escritorio_cnpj_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "Escritorio_cnpj_key" ON public."Escritorio" USING btree (cnpj);


--
-- Name: MembroEscritorio_escritorioId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "MembroEscritorio_escritorioId_idx" ON public."MembroEscritorio" USING btree ("escritorioId");


--
-- Name: MembroEscritorio_userId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "MembroEscritorio_userId_idx" ON public."MembroEscritorio" USING btree ("userId");


--
-- Name: MembroEscritorio_userId_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "MembroEscritorio_userId_key" ON public."MembroEscritorio" USING btree ("userId");


--
-- Name: ParteProcessual_processoId_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "ParteProcessual_processoId_idx" ON public."ParteProcessual" USING btree ("processoId");


--
-- Name: ParteProcessual_tipoParte_idx; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE INDEX "ParteProcessual_tipoParte_idx" ON public."ParteProcessual" USING btree ("tipoParte");


--
-- Name: Processo_numero_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "Processo_numero_key" ON public."Processo" USING btree (numero);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: advocacia
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Advogado Advogado_escritorioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Advogado"
    ADD CONSTRAINT "Advogado_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES public."Escritorio"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Advogado Advogado_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Advogado"
    ADD CONSTRAINT "Advogado_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Cliente Cliente_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Cliente"
    ADD CONSTRAINT "Cliente_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConfiguracaoIA ConfiguracaoIA_advogadoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."ConfiguracaoIA"
    ADD CONSTRAINT "ConfiguracaoIA_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES public."Advogado"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConsultaProjudi ConsultaProjudi_processoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."ConsultaProjudi"
    ADD CONSTRAINT "ConsultaProjudi_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES public."Processo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentoIA DocumentoIA_advogadoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."DocumentoIA"
    ADD CONSTRAINT "DocumentoIA_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES public."Advogado"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentoIA DocumentoIA_clienteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."DocumentoIA"
    ADD CONSTRAINT "DocumentoIA_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES public."Cliente"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DocumentoIA DocumentoIA_processoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."DocumentoIA"
    ADD CONSTRAINT "DocumentoIA_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES public."Processo"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Documento Documento_processoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Documento"
    ADD CONSTRAINT "Documento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES public."Processo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Escritorio Escritorio_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Escritorio"
    ADD CONSTRAINT "Escritorio_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."Advogado"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MembroEscritorio MembroEscritorio_escritorioId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."MembroEscritorio"
    ADD CONSTRAINT "MembroEscritorio_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES public."Escritorio"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MembroEscritorio MembroEscritorio_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."MembroEscritorio"
    ADD CONSTRAINT "MembroEscritorio_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Mensagem Mensagem_processoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Mensagem"
    ADD CONSTRAINT "Mensagem_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES public."Processo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ParteProcessual ParteProcessual_processoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."ParteProcessual"
    ADD CONSTRAINT "ParteProcessual_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES public."Processo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Processo Processo_advogadoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Processo"
    ADD CONSTRAINT "Processo_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES public."Advogado"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Processo Processo_clienteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: advocacia
--

ALTER TABLE ONLY public."Processo"
    ADD CONSTRAINT "Processo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES public."Cliente"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 1059q1U9QU1vCLQq853gtIk06XwCHhgqGH6EPg9O1nzrTDgvTsagI5O2jvuw2Ug


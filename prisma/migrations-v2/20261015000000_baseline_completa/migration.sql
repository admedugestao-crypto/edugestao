-- Baseline completa para novos bancos. Nunca executar em banco já populado.
-- O histórico legado permanece intacto em prisma/migrations.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('SUPERADMIN', 'PROFESSORA', 'SUPERADMIN_PROFESSORA', 'AUXILIAR', 'PLATAFORMA');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('AULA', 'RECESSO', 'FERIADO', 'EVENTO', 'REUNIAO');

-- CreateEnum
CREATE TYPE "PeriodicidadeAgenda" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL');

-- CreateEnum
CREATE TYPE "StatusAluno" AS ENUM ('ATIVO', 'PAUSADO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "StatusAula" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA', 'FALTA_ALUNO', 'FALTA_PROFESSOR');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "codigoIbge" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "whatsappPausado" BOOLEAN NOT NULL DEFAULT false,
    "emailPausado" BOOLEAN NOT NULL DEFAULT false,
    "prazoAlertaProvaDias" INTEGER NOT NULL DEFAULT 7,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fonnteToken" TEXT,
    "evolutionApiUrl" TEXT,
    "evolutionApiKey" TEXT,
    "evolutionApiInstance" TEXT,
    "fonnteAlertaEnviado" BOOLEAN NOT NULL DEFAULT false,
    "emailHost" TEXT,
    "emailPort" TEXT,
    "emailUser" TEXT,
    "emailPass" TEXT,
    "emailFrom" TEXT,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpira" TIMESTAMP(3),
    "perfil" "Perfil" NOT NULL DEFAULT 'PROFESSORA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "foto" TEXT,
    "whatsapp" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes_ativas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rota" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaAtividade" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_ativas_pkey" PRIMARY KEY ("id","usuarioId")
);

-- CreateTable
CREATE TABLE "professoras" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "telefone" TEXT,
    "disponibilidade" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6366f1',

    CONSTRAINT "materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professora_materias" (
    "professoraId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    CONSTRAINT "professora_materias_pkey" PRIMARY KEY ("professoraId","materiaId")
);

-- CreateTable
CREATE TABLE "metodos_ensino" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "metodos_ensino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_avaliacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "tipos_avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escolas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "rede" TEXT,
    "metodoId" TEXT,
    "periodoAvaliacao" TEXT,
    "periodoLetivo1Inicio" TIMESTAMP(3),
    "periodoLetivo1Fim" TIMESTAMP(3),
    "periodoLetivo2Inicio" TIMESTAMP(3),
    "periodoLetivo2Fim" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "escolaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "telefone" TEXT,
    "diretor" TEXT,
    "turno" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendario_escolar" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoEvento" NOT NULL DEFAULT 'AULA',
    "descricao" TEXT,

    CONSTRAINT "calendario_escolar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "materiaId" TEXT,
    "serie" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notaMax" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "periodo" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_prova" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "professoraId" TEXT NOT NULL,
    "avaliacaoId" TEXT NOT NULL,
    "diasAntes" INTEGER NOT NULL,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp" TEXT,
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_prova_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "professoraId" TEXT,
    "unidadeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "fotoUrl" TEXT,
    "serie" TEXT NOT NULL,
    "turma" TEXT,
    "responsavel" TEXT,
    "telefoneResponsavel" TEXT,
    "emailResponsavel" TEXT,
    "rua" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "observacoes" TEXT,
    "status" "StatusAluno" NOT NULL DEFAULT 'ATIVO',
    "tipoCobranca" TEXT,
    "valorCobranca" DECIMAL(10,2),
    "diaPagamento" INTEGER,
    "diaPagamento2" INTEGER,
    "diaSemana" INTEGER,
    "horaAula" TEXT,
    "agendaSemanal" JSONB,
    "periodicidadeAgenda" "PeriodicidadeAgenda" NOT NULL DEFAULT 'SEMANAL',
    "diaSemanaCobranca" INTEGER,
    "dataInicioContrato" TIMESTAMP(3),
    "dataFimContrato" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aluno_materias" (
    "alunoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    CONSTRAINT "aluno_materias_pkey" PRIMARY KEY ("alunoId","materiaId")
);

-- CreateTable
CREATE TABLE "notas_periodo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipoPeriodo" TEXT NOT NULL,
    "periodo" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "notas_periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "avaliacaoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "parcela" INTEGER NOT NULL DEFAULT 1,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "valorCobrado" DECIMAL(10,2) NOT NULL,
    "quantidadeAulas" INTEGER,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TIMESTAMP(3),
    "observacao" TEXT,
    "emailTipo" TEXT,
    "emailEnviadoEm" TIMESTAMP(3),
    "origemManual" BOOLEAN NOT NULL DEFAULT false,
    "origemReposicao" BOOLEAN NOT NULL DEFAULT false,
    "tipoCobrancaGerada" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento_aulas" (
    "pagamentoId" TEXT NOT NULL,
    "agendaAulaId" TEXT NOT NULL,

    CONSTRAINT "pagamento_aulas_pkey" PRIMARY KEY ("pagamentoId","agendaAulaId")
);

-- CreateTable
CREATE TABLE "conteudos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "materiaId" TEXT,
    "aulaId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "topico" TEXT NOT NULL,
    "descricao" TEXT,
    "arquivoUrl" TEXT,
    "planejado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conteudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudo_materias" (
    "conteudoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    CONSTRAINT "conteudo_materias_pkey" PRIMARY KEY ("conteudoId","materiaId")
);

-- CreateTable
CREATE TABLE "biblioteca_materiais" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "metodo" TEXT,
    "metodoId" TEXT,
    "serie" TEXT,
    "materiaId" TEXT,
    "arquivoUrl" TEXT NOT NULL,
    "arquivoNome" TEXT,
    "texto_busca" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biblioteca_materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biblioteca_material_materias" (
    "materialId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    CONSTRAINT "biblioteca_material_materias_pkey" PRIMARY KEY ("materialId","materiaId")
);

-- CreateTable
CREATE TABLE "agenda_aulas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "professoraId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "materiaId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "status" "StatusAula" NOT NULL DEFAULT 'AGENDADA',
    "reposicao" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_aulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_aula_materias" (
    "id" TEXT NOT NULL,
    "agendaAulaId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    CONSTRAINT "agenda_aula_materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_aula" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "agendaAulaId" TEXT NOT NULL,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp" TEXT,
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_conteudo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "conteudoId" TEXT NOT NULL,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_conteudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acessos_app" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acessos_app_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_slug_key" ON "empresas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_resetToken_key" ON "usuarios"("resetToken");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresaId_email_key" ON "usuarios"("empresaId", "email");

-- CreateIndex
CREATE INDEX "sessoes_ativas_empresaId_ultimaAtividade_idx" ON "sessoes_ativas"("empresaId", "ultimaAtividade");

-- CreateIndex
CREATE INDEX "sessoes_ativas_usuarioId_idx" ON "sessoes_ativas"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "professoras_usuarioId_key" ON "professoras"("usuarioId");

-- CreateIndex
CREATE INDEX "professoras_empresaId_idx" ON "professoras"("empresaId");

-- CreateIndex
CREATE INDEX "materias_empresaId_idx" ON "materias"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "materias_empresaId_nome_key" ON "materias"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "metodos_ensino_empresaId_idx" ON "metodos_ensino"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "metodos_ensino_empresaId_nome_key" ON "metodos_ensino"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "tipos_avaliacao_empresaId_idx" ON "tipos_avaliacao"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_avaliacao_empresaId_nome_key" ON "tipos_avaliacao"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "escolas_empresaId_idx" ON "escolas"("empresaId");

-- CreateIndex
CREATE INDEX "escolas_metodoId_idx" ON "escolas"("metodoId");

-- CreateIndex
CREATE INDEX "unidades_empresaId_idx" ON "unidades"("empresaId");

-- CreateIndex
CREATE INDEX "unidades_escolaId_idx" ON "unidades"("escolaId");

-- CreateIndex
CREATE INDEX "calendario_escolar_empresaId_idx" ON "calendario_escolar"("empresaId");

-- CreateIndex
CREATE INDEX "calendario_escolar_unidadeId_idx" ON "calendario_escolar"("unidadeId");

-- CreateIndex
CREATE INDEX "avaliacoes_empresaId_idx" ON "avaliacoes"("empresaId");

-- CreateIndex
CREATE INDEX "avaliacoes_unidadeId_idx" ON "avaliacoes"("unidadeId");

-- CreateIndex
CREATE INDEX "avaliacoes_materiaId_idx" ON "avaliacoes"("materiaId");

-- CreateIndex
CREATE INDEX "notificacoes_prova_empresaId_idx" ON "notificacoes_prova"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_prova_professoraId_avaliacaoId_diasAntes_key" ON "notificacoes_prova"("professoraId", "avaliacaoId", "diasAntes");

-- CreateIndex
CREATE INDEX "alunos_empresaId_idx" ON "alunos"("empresaId");

-- CreateIndex
CREATE INDEX "alunos_empresaId_status_nome_idx" ON "alunos"("empresaId", "status", "nome");

-- CreateIndex
CREATE INDEX "alunos_professoraId_idx" ON "alunos"("professoraId");

-- CreateIndex
CREATE INDEX "alunos_unidadeId_idx" ON "alunos"("unidadeId");

-- CreateIndex
CREATE INDEX "notas_periodo_empresaId_alunoId_ano_idx" ON "notas_periodo"("empresaId", "alunoId", "ano");

-- CreateIndex
CREATE INDEX "notas_periodo_empresaId_ano_alunoId_idx" ON "notas_periodo"("empresaId", "ano", "alunoId");

-- CreateIndex
CREATE UNIQUE INDEX "notas_periodo_empresaId_alunoId_materiaId_ano_tipoPeriodo_perio" ON "notas_periodo"("empresaId", "alunoId", "materiaId", "ano", "tipoPeriodo", "periodo");

-- CreateIndex
CREATE INDEX "notas_empresaId_idx" ON "notas"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "notas_alunoId_avaliacaoId_materiaId_key" ON "notas"("alunoId", "avaliacaoId", "materiaId");

-- CreateIndex
CREATE INDEX "pagamentos_empresaId_idx" ON "pagamentos"("empresaId");

-- CreateIndex
CREATE INDEX "pagamentos_empresaId_mes_ano_dataVencimento_parcela_idx" ON "pagamentos"("empresaId", "mes", "ano", "dataVencimento", "parcela");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_alunoId_mes_ano_parcela_key" ON "pagamentos"("alunoId", "mes", "ano", "parcela");

-- CreateIndex
CREATE UNIQUE INDEX "conteudos_aulaId_key" ON "conteudos"("aulaId");

-- CreateIndex
CREATE INDEX "conteudos_empresaId_idx" ON "conteudos"("empresaId");

-- CreateIndex
CREATE INDEX "conteudos_alunoId_idx" ON "conteudos"("alunoId");

-- CreateIndex
CREATE INDEX "conteudos_materiaId_idx" ON "conteudos"("materiaId");

-- CreateIndex
CREATE INDEX "biblioteca_materiais_empresaId_idx" ON "biblioteca_materiais"("empresaId");

-- CreateIndex
CREATE INDEX "biblioteca_materiais_materiaId_idx" ON "biblioteca_materiais"("materiaId");

-- CreateIndex
CREATE INDEX "biblioteca_materiais_metodoId_idx" ON "biblioteca_materiais"("metodoId");

-- CreateIndex
CREATE INDEX "agenda_aulas_empresaId_idx" ON "agenda_aulas"("empresaId");

-- CreateIndex
CREATE INDEX "agenda_aulas_empresaId_data_horaInicio_idx" ON "agenda_aulas"("empresaId", "data", "horaInicio");

-- CreateIndex
CREATE INDEX "agenda_aulas_professoraId_idx" ON "agenda_aulas"("professoraId");

-- CreateIndex
CREATE INDEX "agenda_aulas_alunoId_idx" ON "agenda_aulas"("alunoId");

-- CreateIndex
CREATE INDEX "agenda_aulas_materiaId_idx" ON "agenda_aulas"("materiaId");

-- CreateIndex
CREATE UNIQUE INDEX "agenda_aula_materias_agendaAulaId_materiaId_key" ON "agenda_aula_materias"("agendaAulaId", "materiaId");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_aula_agendaAulaId_key" ON "notificacoes_aula"("agendaAulaId");

-- CreateIndex
CREATE INDEX "notificacoes_aula_empresaId_idx" ON "notificacoes_aula"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_conteudo_conteudoId_key" ON "notificacoes_conteudo"("conteudoId");

-- CreateIndex
CREATE INDEX "notificacoes_conteudo_empresaId_idx" ON "notificacoes_conteudo"("empresaId");

-- CreateIndex
CREATE INDEX "acessos_app_criadoEm_idx" ON "acessos_app"("criadoEm");

-- CreateIndex
CREATE INDEX "acessos_app_empresaId_criadoEm_idx" ON "acessos_app"("empresaId", "criadoEm");

-- CreateIndex
CREATE INDEX "acessos_app_usuarioId_criadoEm_idx" ON "acessos_app"("usuarioId", "criadoEm");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_ativas" ADD CONSTRAINT "sessoes_ativas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_ativas" ADD CONSTRAINT "sessoes_ativas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professoras" ADD CONSTRAINT "professoras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professoras" ADD CONSTRAINT "professoras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materias" ADD CONSTRAINT "materias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professora_materias" ADD CONSTRAINT "professora_materias_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professora_materias" ADD CONSTRAINT "professora_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metodos_ensino" ADD CONSTRAINT "metodos_ensino_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_avaliacao" ADD CONSTRAINT "tipos_avaliacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolas" ADD CONSTRAINT "escolas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escolas" ADD CONSTRAINT "escolas_metodoId_fkey" FOREIGN KEY ("metodoId") REFERENCES "metodos_ensino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendario_escolar" ADD CONSTRAINT "calendario_escolar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendario_escolar" ADD CONSTRAINT "calendario_escolar_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_prova" ADD CONSTRAINT "notificacoes_prova_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_prova" ADD CONSTRAINT "notificacoes_prova_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_prova" ADD CONSTRAINT "notificacoes_prova_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "avaliacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno_materias" ADD CONSTRAINT "aluno_materias_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno_materias" ADD CONSTRAINT "aluno_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_periodo" ADD CONSTRAINT "notas_periodo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notas_periodo" ADD CONSTRAINT "notas_periodo_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notas_periodo" ADD CONSTRAINT "notas_periodo_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "avaliacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_aulas" ADD CONSTRAINT "pagamento_aulas_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "pagamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_aulas" ADD CONSTRAINT "pagamento_aulas_agendaAulaId_fkey" FOREIGN KEY ("agendaAulaId") REFERENCES "agenda_aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "agenda_aulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudo_materias" ADD CONSTRAINT "conteudo_materias_conteudoId_fkey" FOREIGN KEY ("conteudoId") REFERENCES "conteudos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudo_materias" ADD CONSTRAINT "conteudo_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biblioteca_materiais" ADD CONSTRAINT "biblioteca_materiais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biblioteca_materiais" ADD CONSTRAINT "biblioteca_materiais_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biblioteca_materiais" ADD CONSTRAINT "biblioteca_materiais_metodoId_fkey" FOREIGN KEY ("metodoId") REFERENCES "metodos_ensino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biblioteca_material_materias" ADD CONSTRAINT "biblioteca_material_materias_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "biblioteca_materiais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biblioteca_material_materias" ADD CONSTRAINT "biblioteca_material_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aulas" ADD CONSTRAINT "agenda_aulas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aulas" ADD CONSTRAINT "agenda_aulas_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aulas" ADD CONSTRAINT "agenda_aulas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aulas" ADD CONSTRAINT "agenda_aulas_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aula_materias" ADD CONSTRAINT "agenda_aula_materias_agendaAulaId_fkey" FOREIGN KEY ("agendaAulaId") REFERENCES "agenda_aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aula_materias" ADD CONSTRAINT "agenda_aula_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_aula" ADD CONSTRAINT "notificacoes_aula_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_aula" ADD CONSTRAINT "notificacoes_aula_agendaAulaId_fkey" FOREIGN KEY ("agendaAulaId") REFERENCES "agenda_aulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_conteudo" ADD CONSTRAINT "notificacoes_conteudo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_conteudo" ADD CONSTRAINT "notificacoes_conteudo_conteudoId_fkey" FOREIGN KEY ("conteudoId") REFERENCES "conteudos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acessos_app" ADD CONSTRAINT "acessos_app_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acessos_app" ADD CONSTRAINT "acessos_app_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Índices parciais preservados da migração de desempenho do histórico legado.
ALTER TABLE "notas_periodo" ADD CONSTRAINT "notas_periodo_valor_check" CHECK ("valor" >= 0 AND "valor" <= 10);
ALTER TABLE "notas_periodo" ADD CONSTRAINT "notas_periodo_periodo_check" CHECK ("periodo" BETWEEN 0 AND 4);
CREATE INDEX "agenda_aulas_empresa_agendadas_data_idx"
  ON "agenda_aulas" ("empresaId", "data") WHERE "status" = 'AGENDADA';
CREATE INDEX "pagamentos_empresa_abertos_idx"
  ON "pagamentos" ("empresaId") WHERE "pago" = false;

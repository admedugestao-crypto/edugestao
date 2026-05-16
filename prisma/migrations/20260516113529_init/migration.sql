-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('SUPERADMIN', 'PROFESSORA', 'AUXILIAR');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('AULA', 'RECESSO', 'FERIADO', 'EVENTO', 'REUNIAO');

-- CreateEnum
CREATE TYPE "StatusAluno" AS ENUM ('ATIVO', 'PAUSADO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "StatusAula" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA', 'FALTA_ALUNO', 'FALTA_PROFESSOR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'PROFESSORA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "foto" TEXT,
    "whatsapp" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professoras" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias" (
    "id" TEXT NOT NULL,
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
CREATE TABLE "escolas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "rede" TEXT,
    "periodoAvaliacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
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
    "unidadeId" TEXT NOT NULL,
    "materiaId" TEXT,
    "serie" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notaMax" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "periodo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_prova" (
    "id" TEXT NOT NULL,
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
    "professoraId" TEXT NOT NULL,
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
    "valorCobranca" DOUBLE PRECISION,
    "diaPagamento" INTEGER,
    "diaPagamento2" INTEGER,
    "diaSemana" INTEGER,
    "horaAula" TEXT,
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
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
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
    "alunoId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "parcela" INTEGER NOT NULL DEFAULT 1,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "valorCobrado" DOUBLE PRECISION NOT NULL,
    "quantidadeAulas" INTEGER,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TIMESTAMP(3),
    "observacao" TEXT,
    "emailTipo" TEXT,
    "emailEnviadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudos" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "topico" TEXT NOT NULL,
    "descricao" TEXT,
    "arquivoUrl" TEXT,
    "planejado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conteudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_aulas" (
    "id" TEXT NOT NULL,
    "professoraId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "materiaId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "status" "StatusAula" NOT NULL DEFAULT 'AGENDADA',
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_aulas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professoras_usuarioId_key" ON "professoras"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "materias_nome_key" ON "materias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_prova_professoraId_avaliacaoId_diasAntes_key" ON "notificacoes_prova"("professoraId", "avaliacaoId", "diasAntes");

-- CreateIndex
CREATE UNIQUE INDEX "notas_alunoId_avaliacaoId_materiaId_key" ON "notas"("alunoId", "avaliacaoId", "materiaId");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_alunoId_mes_ano_parcela_key" ON "pagamentos"("alunoId", "mes", "ano", "parcela");

-- AddForeignKey
ALTER TABLE "professoras" ADD CONSTRAINT "professoras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professora_materias" ADD CONSTRAINT "professora_materias_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professora_materias" ADD CONSTRAINT "professora_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendario_escolar" ADD CONSTRAINT "calendario_escolar_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_prova" ADD CONSTRAINT "notificacoes_prova_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_prova" ADD CONSTRAINT "notificacoes_prova_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "avaliacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno_materias" ADD CONSTRAINT "aluno_materias_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aluno_materias" ADD CONSTRAINT "aluno_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "avaliacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aulas" ADD CONSTRAINT "agenda_aulas_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aulas" ADD CONSTRAINT "agenda_aulas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_aulas" ADD CONSTRAINT "agenda_aulas_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

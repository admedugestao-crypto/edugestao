-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" TEXT NOT NULL DEFAULT 'PROFESSORA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "professoras" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "telefone" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "professoras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "materias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6366f1'
);

-- CreateTable
CREATE TABLE "professora_materias" (
    "professoraId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    PRIMARY KEY ("professoraId", "materiaId"),
    CONSTRAINT "professora_materias_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "professora_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "escolas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "rede" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unidades_escolaId_fkey" FOREIGN KEY ("escolaId") REFERENCES "escolas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendario_escolar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'AULA',
    "descricao" TEXT,
    CONSTRAINT "calendario_escolar_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "avaliacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unidadeId" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "peso" REAL NOT NULL DEFAULT 1.0,
    "notaMax" REAL NOT NULL DEFAULT 10.0,
    "periodo" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "avaliacoes_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "professoraId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" DATETIME,
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
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "alunos_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alunos_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "aluno_materias" (
    "alunoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    PRIMARY KEY ("alunoId", "materiaId"),
    CONSTRAINT "aluno_materias_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "aluno_materias_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alunoId" TEXT NOT NULL,
    "avaliacaoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "observacao" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notas_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "avaliacoes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notas_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conteudos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alunoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "topico" TEXT NOT NULL,
    "descricao" TEXT,
    "planejado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conteudos_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "conteudos_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professoras_usuarioId_key" ON "professoras"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "materias_nome_key" ON "materias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "notas_alunoId_avaliacaoId_materiaId_key" ON "notas"("alunoId", "avaliacaoId", "materiaId");

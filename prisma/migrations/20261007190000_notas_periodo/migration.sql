CREATE TABLE "notas_periodo" (
 "id" TEXT NOT NULL,
 "empresaId" TEXT NOT NULL,
 "alunoId" TEXT NOT NULL,
 "materiaId" TEXT NOT NULL,
 "ano" INTEGER NOT NULL,
 "tipoPeriodo" TEXT NOT NULL,
 "periodo" INTEGER NOT NULL,
 "valor" DOUBLE PRECISION NOT NULL,
 CONSTRAINT "notas_periodo_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "notas_periodo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id"),
 CONSTRAINT "notas_periodo_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE,
 CONSTRAINT "notas_periodo_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "materias"("id") ON DELETE CASCADE,
 CONSTRAINT "notas_periodo_valor_check" CHECK ("valor" >= 0 AND "valor" <= 10),
 CONSTRAINT "notas_periodo_periodo_check" CHECK ("periodo" BETWEEN 0 AND 4)
);
CREATE UNIQUE INDEX "notas_periodo_empresaId_alunoId_materiaId_ano_tipoPeriodo_periodo_key" ON "notas_periodo"("empresaId", "alunoId", "materiaId", "ano", "tipoPeriodo", "periodo");
CREATE INDEX "notas_periodo_empresaId_alunoId_ano_idx" ON "notas_periodo"("empresaId", "alunoId", "ano");

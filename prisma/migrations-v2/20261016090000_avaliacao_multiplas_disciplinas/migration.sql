-- Permite associar mais de uma disciplina a uma prova.
CREATE TABLE "avaliacao_materias" (
    "avaliacaoId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,

    CONSTRAINT "avaliacao_materias_pkey" PRIMARY KEY ("avaliacaoId", "materiaId")
);

CREATE INDEX "avaliacao_materias_materiaId_idx" ON "avaliacao_materias"("materiaId");

ALTER TABLE "avaliacao_materias"
  ADD CONSTRAINT "avaliacao_materias_avaliacaoId_fkey"
  FOREIGN KEY ("avaliacaoId") REFERENCES "avaliacoes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "avaliacao_materias"
  ADD CONSTRAINT "avaliacao_materias_materiaId_fkey"
  FOREIGN KEY ("materiaId") REFERENCES "materias"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserva as provas existentes como provas de uma única disciplina.
INSERT INTO "avaliacao_materias" ("avaliacaoId", "materiaId")
SELECT "id", "materiaId"
FROM "avaliacoes"
WHERE "materiaId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Mantém a contagem de alunos ativos por professora eficiente no painel interno.
CREATE INDEX "alunos_status_professoraId_empresaId_idx"
ON "alunos"("status", "professoraId", "empresaId");

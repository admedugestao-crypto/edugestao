UPDATE "AgendaAula"
SET status = 'AGENDADA'
WHERE "alunoId" = (SELECT id FROM "Aluno" WHERE nome = 'Laura' LIMIT 1)
  AND data >= '2026-06-18 00:00:00'
  AND data <  '2026-06-19 00:00:00';

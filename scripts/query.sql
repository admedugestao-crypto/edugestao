-- Marca o conteúdo mais recente (planejado) como Ministrado
-- e a agenda vinculada como REALIZADA, para teste do fluxo de reversão
UPDATE "Conteudo" SET planejado = false
WHERE id = (
  SELECT c.id FROM "Conteudo" c
  JOIN "AgendaAula" ag ON ag."alunoId" = c."alunoId"
    AND ag.data >= date_trunc('day', c.data AT TIME ZONE 'UTC')
    AND ag.data < date_trunc('day', c.data AT TIME ZONE 'UTC') + interval '1 day'
  WHERE c.planejado = true
    AND ag.status = 'AGENDADA'
  ORDER BY c.data DESC
  LIMIT 1
);

UPDATE "AgendaAula" SET status = 'REALIZADA'
WHERE id = (
  SELECT ag.id FROM "AgendaAula" ag
  JOIN "Conteudo" c ON c."alunoId" = ag."alunoId"
    AND c.data >= date_trunc('day', ag.data AT TIME ZONE 'UTC')
    AND c.data < date_trunc('day', ag.data AT TIME ZONE 'UTC') + interval '1 day'
  WHERE c.planejado = false
    AND ag.status = 'AGENDADA'
  ORDER BY ag.data DESC
  LIMIT 1
);

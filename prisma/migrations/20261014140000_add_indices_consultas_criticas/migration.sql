-- Índices das consultas mais frequentes de alunos, agenda, financeiro e painel.
CREATE INDEX "alunos_empresaId_status_nome_idx"
  ON "alunos" ("empresaId", "status", "nome");

CREATE INDEX "agenda_aulas_empresaId_data_horaInicio_idx"
  ON "agenda_aulas" ("empresaId", "data", "horaInicio");

CREATE INDEX "pagamentos_empresaId_mes_ano_dataVencimento_parcela_idx"
  ON "pagamentos" ("empresaId", "mes", "ano", "dataVencimento", "parcela");

CREATE INDEX "notas_periodo_empresaId_ano_alunoId_idx"
  ON "notas_periodo" ("empresaId", "ano", "alunoId");

-- Índices parciais para os subconjuntos consultados pelo painel.
CREATE INDEX "agenda_aulas_empresa_agendadas_data_idx"
  ON "agenda_aulas" ("empresaId", "data")
  WHERE "status" = 'AGENDADA';

CREATE INDEX "pagamentos_empresa_abertos_idx"
  ON "pagamentos" ("empresaId")
  WHERE "pago" = false;

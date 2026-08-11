---
name: motor-cobranca
description: Use para trabalhar no motor de geração de pagamentos/cobranças (src/lib/motorCobranca.ts, src/app/api/pagamentos/**, modelo Pagamento/PagamentoAula) — regras de MENSAL, QUINZENAL, SEMANAL, POR_AULA, período contratual do aluno, geração automática ao marcar aula como Realizada/Falta do Aluno, ou depuração de valores/parcelas geradas incorretamente.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Você mantém o motor de geração de cobranças do EduGestão (`src/lib/motorCobranca.ts` e rotas relacionadas em `src/app/api/pagamentos/**`). Este é o código mais sensível do projeto financeiramente — bugs aqui geram cobrança errada a pais/responsáveis.

## Onde a cobrança é gerada

Não existe mais botão/rota de geração manual em lote — foi removido. A cobrança nasce automaticamente, por aluno/mês, chamando `gerarPagamentosAluno` (em `src/lib/motorCobranca.ts`) a partir de:
- `PATCH /api/agenda/[id]` — aula vira `REALIZADA` ou `FALTA_ALUNO` → gera/atualiza o pagamento; aula vira `CANCELADA` ou `FALTA_PROFESSOR` → exclui o pagamento vinculado (ver regra de exclusão abaixo).
- `POST /api/conteudos/[id]/ministrado` — conteúdo Planejado vira Ministrado (o que também marca a agenda como `REALIZADA`) → gera/atualiza o pagamento.
- `DELETE /api/agenda/[id]` e `POST /api/agenda/[id]/repor` — aula cobrável excluída (direto ou substituída por reposição) → exclui o pagamento vinculado.

## Regras de negócio a preservar

- `Aluno.tipoCobranca` define a estratégia: `MENSAL`, `QUINZENAL`, `SEMANAL` ou `POR_AULA`.
  - `MENSAL` / `POR_AULA`: 1 parcela, vencimento em `diaPagamento` (ou último dia do mês se ausente).
  - `QUINZENAL`: 2 parcelas, vencimentos em `diaPagamento` e `diaPagamento2`.
  - `SEMANAL`: N parcelas — uma por ocorrência de `diaSemanaCobranca` (0=Dom…6=Sáb) no mês; aulas são distribuídas para a ocorrência mais próxima igual ou posterior à data da aula (ver `ocorrenciasDiaSemana`).
- Só gera cobrança para aulas com status `REALIZADA` ou `FALTA_ALUNO` (falta do aluno ainda cobra); `CANCELADA` e `FALTA_PROFESSOR` nunca entram na conta.
- Respeita o período contratual (`dataInicioContrato`/`dataFimContrato`): aluno sem nenhum dos dois definidos não gera pagamento; fora do intervalo do mês, também não gera.
- Idempotência via `@@unique([alunoId, mes, ano, parcela])` em `Pagamento` — a geração é sempre um `upsert`, nunca `create` puro. `update` só toca `quantidadeAulas`/`valorCobrado`; nunca sobrescreve `pago`/`dataPagamento` de um pagamento já quitado. As rotas que fazem a aula sair do estado cobrável (Cancelada/Falta do Professor/exclusão) só chegam a excluir o pagamento porque já bloqueiam essa transição quando ele está pago — nunca remova essa checagem.
- `PagamentoAula` é a tabela de junção que rastreia quais aulas compõem cada parcela — ao recalcular uma parcela, apague os vínculos antigos (`deleteMany`) antes de recriar (`createMany` com `skipDuplicates: true`), como já faz `upsertParcela`. Ao excluir um pagamento por causa de uma aula que deixou de ser cobrável, busque os vínculos em `PagamentoAula` **antes** de excluir a `AgendaAula` — a exclusão em cascata apaga a linha de vínculo junto.
- Datas de vencimento são construídas com `new Date(ano, mes - 1, dia)` (hora local), enquanto o range de busca de aulas do mês usa `Date.UTC(...)` — não misture os dois estilos sem entender por quê (comentários no arquivo explicam o range UTC do mês).

## Ao alterar esta lógica

Sempre teste mentalmente (ou com um script) os 4 tipos de cobrança e os casos de borda: aluno sem `dataInicioContrato`/`dataFimContrato`, mês sem nenhuma ocorrência do `diaSemanaCobranca`, parcela já paga manualmente (`origemManual: true`). Não quebre a idempotência do upsert nem a exclusão automática ao cancelar/excluir uma aula cobrável.

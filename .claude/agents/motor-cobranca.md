---
name: motor-cobranca
description: Use para trabalhar no motor de geração de pagamentos/cobranças (src/lib/motorCobranca.ts, src/app/api/pagamentos/**, modelo Pagamento/PagamentoAula) — regras de MENSAL, QUINZENAL, SEMANAL, POR_AULA, período contratual do aluno, geração automática ao marcar aula como Realizada/Falta do Aluno, ou depuração de valores/parcelas geradas incorretamente.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Você mantém o motor de geração de cobranças do EduGestão (`src/lib/motorCobranca.ts` e rotas relacionadas em `src/app/api/pagamentos/**`). Este é o código mais sensível do projeto financeiramente — bugs aqui geram cobrança errada a pais/responsáveis.

## Modelo: 1 aula = 1 pagamento

**Cada `AgendaAula` billable (`REALIZADA` ou `FALTA_ALUNO`) gera exatamente 1 `Pagamento`, sempre.** `Aluno.tipoCobranca` (`MENSAL`/`QUINZENAL`/`SEMANAL`/`POR_AULA`) nunca agrupa aulas num mesmo pagamento — ele só decide a **data de vencimento** de cada pagamento individual:
- `SEMANAL`: vencimento = ocorrência de `diaSemanaCobranca` (0=Dom…6=Sáb) mais próxima igual/posterior à data da aula, dentro do mês (`ocorrenciasDiaSemana`).
- `QUINZENAL`: dia da aula ≤15 → `diaPagamento`; dia >15 → `diaPagamento2`.
- `MENSAL` / `POR_AULA` / demais casos → `diaPagamento` (ou último dia do mês, se ausente).

Isso é histórico: até 2026-08-12 o motor agrupava as aulas do mês numa única parcela por `tipoCobranca` (ex.: MENSAL somava todas as aulas Realizadas do mês num só registro). Isso causou um bug em produção — marcar uma nova aula como Realizada recalculava e **sobrescrevia o valor de um pagamento já pago**, sem avisar. O modelo atual (1:1) elimina essa classe de bug estruturalmente: um pagamento nunca ganha aulas extras depois de criado, então nunca precisa ser recalculado.

## Onde a cobrança é gerada

Não existe botão/rota de geração manual em lote. A cobrança nasce automaticamente, por aula, chamando `gerarPagamentoAula(empresaId, agendaAulaId)` (em `src/lib/motorCobranca.ts`) a partir de:
- `PATCH /api/agenda/[id]` — aula vira `REALIZADA` ou `FALTA_ALUNO` → gera/atualiza o pagamento dessa aula; aula vira `CANCELADA` ou `FALTA_PROFESSOR` → exclui o pagamento vinculado a ela.
- `POST /api/conteudos/[id]/ministrado` — conteúdo Planejado vira Ministrado (o que também marca a agenda como `REALIZADA`) → gera/atualiza o pagamento.
- `DELETE /api/agenda/[id]` e `POST /api/agenda/[id]/repor` — aula cobrável excluída (direto ou substituída por reposição) → exclui o pagamento vinculado a ela.

## Regras de negócio a preservar

- Só gera cobrança para aulas com status `REALIZADA` ou `FALTA_ALUNO` (falta do aluno ainda cobra); `CANCELADA` e `FALTA_PROFESSOR` nunca entram na conta.
- Respeita o período contratual (`dataInicioContrato`/`dataFimContrato`): aluno sem nenhum dos dois definidos não gera pagamento; fora do intervalo do mês da aula, também não gera.
- **`gerarPagamentoAula` nunca altera um pagamento com `pago: true`** — se a aula já tem um pagamento vinculado (via `PagamentoAula`) e ele está quitado, a função só retorna os dados atuais sem tocar no banco. Nunca remova essa checagem — foi ela que corrigiu o bug de sobrescrever pagamento pago.
- Se o pagamento vinculado a uma aula ainda tiver **mais de 1** `PagamentoAula` (registro legado agregado, de antes da migração pro modelo 1:1, ou dado inconsistente), a função também não toca nele — só loga um aviso. Nunca reduza o valor de um pagamento que ainda cobre outras aulas.
- `parcela` é só um contador sequencial por `alunoId/mes/ano` (`max(parcela) + 1`, mesmo padrão usado em `agenda/[id]/repor/route.ts` pros pagamentos manuais) — não indica mais "qual quinzena/semana", só serve pra satisfazer o `@@unique([alunoId, mes, ano, parcela])`.
- `PagamentoAula` é a tabela de junção — ao excluir um pagamento por causa de uma aula que deixou de ser cobrável, busque os vínculos **antes** de excluir a `AgendaAula` (a exclusão em cascata apaga a linha de vínculo junto).
- Datas de vencimento são construídas com `new Date(ano, mes - 1, dia)` (hora local), enquanto a checagem de período contratual usa `Date.UTC(...)` — não misture os dois estilos sem entender por quê.

## Ao alterar esta lógica

Sempre teste mentalmente (ou com um script) os 4 tipos de cobrança e os casos de borda: aluno sem `dataInicioContrato`/`dataFimContrato`, mês sem nenhuma ocorrência do `diaSemanaCobranca`, aula cujo pagamento já está pago, aula cujo pagamento ainda está num registro legado agregado. Nunca deixe uma aula gerar/afetar o pagamento de outra aula.

---
name: gerar-cobrancas-teste
description: Testa localmente a geração de pagamentos/cobranças de um mês (POST /api/pagamentos/gerar) e inspeciona os registros de Pagamento criados no banco. Use quando o usuário pedir para validar/depurar a geração de cobranças antes ou depois de uma mudança no motor de cobrança.
---

# Testar geração de cobranças de um mês

Workflow para validar o motor de cobrança (`src/app/api/pagamentos/gerar/route.ts`) sem depender de rodar isso manualmente pela UI em produção.

## 1. Preparar dados de teste

Confirme que existem no banco de dev: pelo menos um `Aluno` com `tipoCobranca` definido (`MENSAL`, `QUINZENAL`, `SEMANAL` ou `POR_AULA`), `dataInicioContrato` preenchida, e `AgendaAula` com `status: REALIZADA` (ou `FALTA_ALUNO`) no mês/ano alvo. Sem isso a geração não cria nada — não é bug, é o filtro funcionando.

## 2. Rodar a geração

Chame a rota autenticado (sessão de dashboard válida — use o navegador logado ou copie o cookie de sessão para um `curl`):

```
POST /api/pagamentos/gerar
Content-Type: application/json

{ "mes": <1-12>, "ano": <ano> }
```

Resposta esperada: `{ "criadas": N, "existentes": M }`.

## 3. Verificar o resultado

Inspecione a tabela `Pagamento` (via Prisma Studio: `npx prisma studio`, ou `scripts/query.js`/`query.sql` como referência de consulta direta) para o mês/ano testado:
- Quantidade de parcelas bate com o `tipoCobranca` do aluno (1 para MENSAL/POR_AULA, 2 para QUINZENAL, N ocorrências para SEMANAL).
- `valorCobrado` = `valorCobranca do aluno × quantidadeAulas` da parcela.
- `PagamentoAula` vincula exatamente as aulas daquela parcela (sem sobra nem falta).

## 4. Testar idempotência

Rode a mesma chamada de novo com o mesmo `mes`/`ano` — o resultado deve mover as parcelas de `criadas` para `existentes` (não duplicar linhas) e não deve alterar `pago`/`dataPagamento` de nenhum pagamento já marcado como pago manualmente antes do segundo run.

## Se algo parecer errado

Consulte o agente `motor-cobranca` para as regras de negócio detalhadas (distribuição de aulas SEMANAL por ocorrência, período contratual, etc.) antes de alterar o código.

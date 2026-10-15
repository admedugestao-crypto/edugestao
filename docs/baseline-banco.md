# Baseline e transição do histórico de banco

O histórico antigo em `prisma/migrations` está incompleto: as migrações disponíveis não registram todas as mudanças que criaram o modelo multiempresa. Ele é preservado integralmente para auditoria e seus arquivos/checksums não devem ser alterados.

O histórico ativo configurado em `prisma.config.ts` é `prisma/migrations-v2`:

- `20261015000000_baseline_completa`: cria o schema atual, preservando nomes e ações de chaves estrangeiras de notas, suas restrições CHECK e os dois índices parciais;
- `20261015001000_preservar_limite_alerta_prova`: preserva o CHECK de prazo entre 1 e 365 dias.

## Bancos novos

Execute `npx prisma migrate deploy` com uma conexão explícita para um banco vazio. O teste Docker verifica criação, repetição sem pendências, equivalência com o schema e regras não representadas pelo Prisma.

## Bancos existentes

Nunca execute o SQL da baseline em banco existente. Antes do primeiro `migrate deploy` com o novo histórico:

1. Faça backup e confira o destino da conexão sem expor credenciais.
2. Execute `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` com a configuração do banco correto. Exija ausência de diferenças; qualquer diferença precisa de avaliação própria.
3. Confira também os três CHECKs e dois índices parciais, pois não são integralmente representados pelo schema Prisma.
4. Registre as duas migrações usando `prisma migrate resolve --applied NOME_DA_MIGRACAO`.
5. Execute `prisma migrate deploy` e confirme ausência de migrações pendentes.

Esses registros adicionam a nova referência ao histórico sem remover as entradas antigas e sem recriar tabelas. As próximas migrações devem ser criadas exclusivamente em `prisma/migrations-v2`.

## Evidências em 15/10/2026

- Docker vazio: ambas as migrações aplicadas com sucesso.
- Repetição de `migrate deploy`: nenhuma migração pendente.
- Diff entre banco Docker e schema: nenhuma diferença.
- DEV: diff sem diferenças após explicitar no Prisma os nomes e ações existentes de `notas_periodo`.
- DEV: ambas as migrações registradas como já aplicadas; deploy sem pendências, sem executar SQL de criação.
- Produção: não alterada. A transição exige comparação própria, verificação de CHECKs/índices e autorização de promoção.

Não use `migrate reset`, `db push` ou alteração de checksums históricos para esta transição.

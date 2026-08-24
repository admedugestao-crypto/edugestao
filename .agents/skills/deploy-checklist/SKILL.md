---
name: deploy-checklist
description: Checklist antes de fazer deploy do EduGestão para a Vercel (migração de banco, variáveis de ambiente, geração do Prisma Client, cron). Use quando o usuário pedir para preparar ou revisar um deploy.
---

# Checklist de deploy (Vercel)

## Banco de dados

- [ ] Toda migração nova em `prisma/migrations/` foi aplicada no banco de produção (`npx prisma migrate deploy` — nunca `migrate dev` em produção).
- [ ] Mudanças de schema que tornam uma coluna obrigatória em tabela com dados existentes têm plano de backfill antes do deploy (ver comentário sobre a migração multi-empresa no topo de `prisma/schema.prisma` como referência do padrão aditivo já usado no projeto).
- [ ] `DATABASE_URL`/`DIRECT_URL` de produção configuradas nas env vars da Vercel — note que o script de build (`package.json`) usa um `DATABASE_URL` placeholder só para o `next build` não falhar por falta da variável; isso é esperado e não deve ser "corrigido" removendo o placeholder.

## Variáveis de ambiente

Confirme na Vercel (Project Settings → Environment Variables), comparando com `.env`/`.env.local`/`.env.vercel` locais (nunca commitar esses arquivos):
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `BLOB_READ_WRITE_TOKEN` (upload da biblioteca/conteúdos)
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_PORT`, `EMAIL_FROM`
- Credenciais de WhatsApp em uso (`FONNTE_TOKEN` e/ou `EVOLUTION_API_URL`/`EVOLUTION_API_KEY`/`EVOLUTION_INSTANCE`)

## Cron

- [ ] `vercel.json` reflete o(s) job(s) de cron desejado(s) — hoje só `/api/cron/notificacoes` às 11h UTC. Se adicionar novo processo agendado, adicione a entrada em `crons` (respeitando os limites de frequência/quantidade do plano Vercel contratado).

## Build

- [ ] `npm run build` local passa sem erro (roda `prisma generate` antes do `next build`, conforme script em `package.json`).
- [ ] Nenhuma rota de API nova ficou sem `export const dynamic = "force-dynamic"` quando depende de sessão/DB por requisição (evita cache indevido de dados de outro tenant).

## Pós-deploy

- [ ] Testar login de pelo menos um perfil (PROFESSORA e SUPERADMIN) em produção.
- [ ] Confirmar no painel da Vercel que o cron rodou no horário esperado (Logs → Cron Jobs), especialmente após qualquer mudança em `src/lib/notificacoes.ts`.

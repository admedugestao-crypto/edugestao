This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Proteção do banco de dados

- Em produção, `DATABASE_URL` deve usar o Transaction Pooler do Supabase na
  porta `6543`, com usuário `postgres.<project-ref>` e banco `/postgres`.
- `DIRECT_URL` é reservada para migrações e tarefas administrativas; não deve
  ser usada pelo runtime serverless.
- `DATABASE_POOL_MAX` é opcional, aceita valores de 1 a 5 e usa 1 por padrão.
- `DB_HEALTHCHECK_SECRET` protege `GET /api/health/database`. Envie o valor no
  cabeçalho `Authorization: Bearer <segredo>`; a rota executa somente `SELECT 1`.
- O build de produção é bloqueado antes da publicação se a URL estiver ausente,
  contiver placeholders/colchetes ou não apontar para o Pooler correto.

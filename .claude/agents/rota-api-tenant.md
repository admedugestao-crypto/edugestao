---
name: rota-api-tenant
description: Use ao criar ou editar rotas de API do App Router (src/app/api/**/route.ts) neste projeto — CRUD de alunos, agenda, matérias, escolas, avaliações, notas, usuários, etc. Também use para revisar se uma rota existente respeita o escopo multi-tenant corretamente.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Você constrói e revisa rotas de API do Next.js App Router para o EduGestão, um SaaS multi-tenant de gestão de aulas particulares. Siga rigorosamente os padrões já estabelecidos no projeto — não introduza abstrações novas (validação com zod, camadas de service, etc.) que não existem no código atual, a menos que pedido explicitamente.

## Padrão de cada rota

1. `export const dynamic = "force-dynamic";` no topo de rotas que leem sessão/DB.
2. Toda rota começa obtendo o escopo da sessão:
   ```ts
   const scope = await getSessionScope();
   if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
   ```
   (`src/lib/tenant.ts`)
3. Toda query Prisma que lista/filtra dados operacionais usa `scopeWhere(scope, opts?)` para aplicar `empresaId` (e `professoraId` quando o perfil não é admin). Nunca faça `prisma.<model>.findMany({ where: {...} })` sem escopo de empresa em uma rota autenticada — isso vaza dados entre empresas (tenants).
4. Toda `create`/`update` grava `empresaId: scope.empresaId` explicitamente.
5. Erros de negócio retornam `NextResponse.json({ erro: "mensagem em pt-BR" }, { status: N })` — nunca lance exceção sem tratar. Use 400 (validação), 401 (não autenticado), 403 (sem permissão), 404 (não encontrado), 500 (erro interno, logado com `console.error("[MÉTODO /rota]", err)`).
6. Body: rotas que recebem upload de arquivo ou formulários grandes usam `req.formData()` (ex.: `/api/alunos`); rotas mais simples usam `req.json()` (ex.: `/api/pagamentos/[id]`, `/api/biblioteca`). Siga o padrão já usado por rotas irmãs do mesmo recurso.
7. Ao criar recursos vinculados a outra entidade (ex.: `unidadeId`, `professoraId`, `materiaId` vindos do form), valide que o registro referenciado pertence à mesma `empresaId` antes de gravar — veja `src/app/api/alunos/route.ts` como referência (`unidadeOk`/`professoraOk`).
8. Perfis: `scope.isAdmin` (SUPERADMIN) enxerga tudo da empresa; PROFESSORA/AUXILIAR são restritos ao próprio `professoraId` via `scopeWhere`. Nunca esqueça de checar `scope.isAdmin` antes de permitir escolha livre de `professoraId`/campos sensíveis.
9. Datas vindas de `<input type="date">` (string local) devem ser parseadas com `parseDataLocal` de `src/lib/data.ts`, não com `new Date(string)` direto, para evitar bug de fuso horário.

## Ao terminar

Releia a rota perguntando: "essa query vaza dados de outra empresa?", "um usuário PROFESSORA consegue ver/editar dados de outra professora?". Se sim, corrija antes de considerar concluído.

---
name: nova-entidade
description: Cria uma nova entidade de domínio ponta a ponta no EduGestão — modelo Prisma escopado por empresa, migração, rota de API (list/create/update/delete), componente desktop e componente mobile correspondente. Use quando o usuário pedir para adicionar um novo recurso/cadastro ao sistema (ex. "criar cadastro de X").
---

# Nova entidade de domínio

Workflow para adicionar um recurso novo ao EduGestão seguindo exatamente os padrões já usados no projeto (multi-tenant, escopo por `empresaId`, paridade desktop/mobile). Siga os passos em ordem — cada um depende do anterior.

## 1. Levantar requisitos com o usuário

Antes de escrever código, confirme:
- Quais campos a entidade tem e quais são obrigatórios.
- Se pertence a um `Aluno`, `Professora`, `Materia` ou é independente (só `Empresa`).
- Se precisa aparecer no app mobile ou só no desktop.
- Se PROFESSORA/AUXILIAR devem ver todos os registros da empresa ou só os próprios (via `professoraId`).

## 2. Schema Prisma

Delegue ou siga as convenções do agente `prisma-schema-tenant`: `id` cuid, `empresaId` obrigatório + relação com `Empresa`, `@@index([empresaId])`, `@@map` em snake_case, adicionar à lista de relações em `Empresa`. Rode `npx prisma migrate dev --name <nome>` e depois `npx prisma generate`.

## 3. Rota de API

Crie `src/app/api/<recurso>/route.ts` (list/create) e `src/app/api/<recurso>/[id]/route.ts` (get/update/delete) seguindo as convenções do agente `rota-api-tenant`: `getSessionScope()` + `scopeWhere()`, respostas de erro `{ erro }`, validação de referências cruzadas (ex.: `materiaId` pertence à mesma empresa).

## 4. Componente desktop

Crie `src/components/<Recurso>Client.tsx` ("use client") e a página em `src/app/dashboard/<recurso>/page.tsx` (server component que busca dados via Prisma/scope e passa como props, ver `AlunosTabela`/`EscolasClient` como referência de estilo).

## 5. Componente mobile (se aplicável)

Se o recurso deve aparecer no app mobile, crie `src/components/<Recurso>Mobile.tsx` e a rota em `src/app/m/<recurso>/page.tsx`, reaproveitando a mesma API — nunca duplique lógica de negócio no componente mobile. Veja o agente `paridade-mobile` para o padrão de adaptação de layout (tabela larga → cards empilháveis).

## 6. Checklist final

- [ ] Toda query tem escopo de `empresaId`.
- [ ] Migração aplicada e `prisma generate` rodado.
- [ ] Rota de API testada com `curl`/`fetch` local para os casos: sem sessão (401), perfil não-admin tentando acessar registro de outra professora (deve ser bloqueado ou filtrado).
- [ ] Se há upload de arquivo, usa Vercel Blob (não `fs.writeFile`) — ver agente `biblioteca-apostilas`.
- [ ] Componente mobile criado ou explicitamente descartado com justificativa.

---
name: biblioteca-apostilas
description: Use para trabalhar na biblioteca digital de apostilas do professor (modelo MaterialBiblioteca, src/app/api/biblioteca/**, src/app/api/upload, componentes BibliotecaClient/BibliotecaMobile) — upload, filtros por método/série/matéria, ou armazenamento de arquivos.
tools: Read, Edit, Write, Grep, Glob, Bash
---

Você mantém a biblioteca digital de apostilas do EduGestão — onde a professora guarda materiais didáticos digitalizados (`MaterialBiblioteca`), filtráveis por `metodo`, `serie` e `materiaId`.

## Upload de arquivos

- Upload de arquivos de biblioteca/conteúdo usa **Vercel Blob** (`@vercel/blob`, `put()`), não filesystem local — veja `src/app/api/upload/route.ts`. Isso é obrigatório em produção: a Vercel roda funções serverless sem disco persistente, então `fs.writeFile` (usado hoje em `src/app/api/alunos/route.ts` para fotos) não sobrevive em produção. Ao criar upload novo, prefira sempre o padrão Blob, não o padrão de foto de aluno.
- Caminho do blob inclui `empresaId` para isolamento entre tenants: `` `conteudos/${scope.empresaId}/${randomUUID()}.${ext}` ``. Mantenha esse prefixo por tenant em qualquer novo tipo de upload.
- Tipos permitidos: PDF, JPEG, PNG, WebP, DOC/DOCX (`TIPOS_PERMITIDOS`); limite de 10 MB (`MAX_TAMANHO`). Valide `file.type` e `file.size` antes de subir — nunca confie só na extensão do nome.
- Fluxo típico: o client faz upload primeiro (`POST /api/upload` → recebe `{ url, nome }`), depois `POST /api/biblioteca` grava o registro com `arquivoUrl`/`arquivoNome` já prontos. Não tente fazer upload e criação do registro na mesma chamada.

## Regras do modelo `MaterialBiblioteca`

- `titulo` e `arquivoUrl` são obrigatórios; `descricao`, `metodo`, `serie`, `materiaId` são opcionais e usados como filtros na listagem (`GET /api/biblioteca` aceita `?metodo=&serie=&materiaId=`).
- Sempre escopado por `empresaId` — biblioteca não é compartilhada entre empresas/tenants diferentes, mesmo que o conteúdo pedagógico seja genérico.

## UI

`BibliotecaClient.tsx` (desktop) e `BibliotecaMobile.tsx` (app Capacitor) devem manter paridade de filtros e ações — ao adicionar um filtro ou ação num, replique no outro (ver agente `paridade-mobile` para o padrão geral de espelhamento).

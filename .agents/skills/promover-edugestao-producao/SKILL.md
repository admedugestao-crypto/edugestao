---
name: promover-edugestao-producao
description: Conduz mudanças do EduGestão com passagem obrigatória pelo ambiente dev, validação comprovada e promoção seletiva para produção somente após autorização explícita do usuário. Use ao implementar, testar, publicar, promover, fazer deploy ou rollback neste projeto.
---

# Promover EduGestão para produção

Proteja a separação entre desenvolvimento e produção. Toda mudança começa em `dev`; produção nunca é a primeira etapa.

## Regra obrigatória

1. Implemente e versione a mudança na branch `dev`.
2. Publique o Preview da Vercel associado a `dev` e aguarde o estado `Ready`.
3. Teste o fluxo afetado no ambiente dev, em proporção ao risco, e registre evidências objetivas: commit, build, URL, resposta HTTP, logs ou resultado visual.
4. Apresente ao usuário o que foi validado e o conjunto exato de commits que seria promovido.
5. Pare e solicite autorização explícita para produção. Aprovação para trabalhar em dev não autoriza produção.
6. Somente depois de uma resposta inequívoca, como “atualizar produção”, “promover para produção” ou equivalente, aplique exclusivamente os commits aprovados sobre a versão atual de `master` e faça o push/deploy.
7. Aguarde o deployment de produção ficar `Ready` e execute um teste controlado do fluxo promovido.

Se o usuário não autorizar produção, encerre com a mudança disponível apenas em dev.

## Antes da promoção

- Use a skill `deploy-checklist` e cumpra os itens aplicáveis.
- Atualize as referências remotas e compare `dev`, `master` e os commits candidatos.
- Mostre qualquer commit adicional ou dependência que também precisaria entrar. Não inclua silenciosamente mudanças não aprovadas.
- Preserve alterações locais do usuário e arquivos não relacionados. Não use force push, reset destrutivo ou limpeza ampla do worktree.
- Confirme se existem migrações Prisma. Em produção, use somente `prisma migrate deploy`; nunca `prisma migrate dev`.
- Confirme o escopo das variáveis da Vercel sem revelar segredos. Não copie credenciais para arquivos versionados.
- Execute lint, verificação TypeScript, testes pertinentes e build. Registre falhas preexistentes separadamente; não as esconda nem amplie o escopo sem autorização.

## Promoção seletiva

Baseie a promoção na versão mais recente de `origin/master`. Prefira commits pequenos e identificáveis, usando cherry-pick ou método equivalente que preserve apenas o escopo aprovado. Antes do push, confira o diff completo entre `origin/master` e `HEAD`.

Uma autorização vale somente para o conjunto de mudanças apresentado imediatamente antes dela. Se o diff mudar, surgir migração inesperada, houver conflito relevante ou for necessário incluir outro commit, pare e peça nova autorização.

## Verificação pós-deploy

- Confirme status `Ready` e os aliases oficiais de produção.
- Teste o caminho principal afetado sem modificar dados além do necessário para o teste autorizado.
- Consulte logs quando a resposta visual ou HTTP não comprovar o funcionamento integral.
- Informe domínio, commits promovidos, validações realizadas e qualquer risco ou etapa manual restante.

Não faça rollback automaticamente. Se o teste de produção falhar, contenha novas ações, apresente o diagnóstico e solicite autorização para rollback ou correção, salvo quando o usuário já tiver autorizado expressamente esse procedimento.


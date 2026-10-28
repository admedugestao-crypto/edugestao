# Inscrições EG V2 em produção

## Promoção autorizada em 28/10/2026

O solicitante autorizou a publicação da página de inscrição e da lista privada na plataforma. O commit `b086343`, baseado na produção `5db47df`, promoveu somente os arquivos desse recurso a partir da versão validada em dev. Ajustes de conexão exclusivos de Preview/dev, dados locais, artefatos e alterações operacionais sem relação com a campanha ficaram fora da promoção.

## Banco e validação

A preparação pontual exigiu ambiente `production`, branch `master`, opção explícita de execução e banco `kwabqdrmcomnlrjvipiy`. O script conferiu o histórico e permitiu exclusivamente a migração `20261028120000_inscricoes_teste`, usando `prisma migrate deploy`. A alteração adiciona uma tabela e índices, sem modificar cadastros operacionais existentes.

Publicação validada: `https://edugestao-bj4p-jggfljpa5-edugestao-s-projects.vercel.app`, estado Ready, commit `b086343`.

Os registros do build em 28/10/2026, às 20:45:20 UTC, confirmam:

- inscrição sintética persistida no banco de produção;
- registro da autorização de contato e preservação da disponibilidade informada;
- repetição da inscrição sem gerar duplicata;
- bloqueio da lista privada sem sessão;
- consulta autenticada com uma sessão sintética restrita ao servidor de testes;
- marcação de contato persistida;
- remoção do registro sintético e verificação posterior de sua ausência.

Nenhum e-mail ou WhatsApp foi enviado. Nenhum usuário foi criado. O cookie sintético durou dois minutos e permaneceu somente na memória do processo de testes. O teste usou o código compilado do projeto e a conexão real de produção dentro do ambiente Vercel.

Lint, TypeScript, testes de validação e build local passaram antes da promoção. O build de produção também passou. O cron existente permaneceu sem alteração e não foi acionado manualmente.

## Remoção da preparação temporária

Este commit retira o comando de preparação do `vercel.json` e exclui os dois scripts temporários de produção. Não foi criada variável permanente de migração. As próximas publicações utilizam o build normal.

## Endereços oficiais

- Inscrição: `https://edugestao-bj4p.vercel.app/inscricao-teste`
- Lista privada: `https://edugestao-bj4p.vercel.app/plataforma/inscricoes-teste`

A lista exige acesso de administração da plataforma. A equipe inicia o atendimento pelo botão de WhatsApp e registra o contato realizado.

# Inscrição de professores para o teste EG V2

## Escopo

- Página pública `/inscricao-teste`, responsiva e sem exigência de conta.
- Cadastro com nome, WhatsApp, e-mail, matérias, quantidade de alunos, organização atual, dificuldade e disponibilidade.
- Autorização explícita para contato pelo WhatsApp, com versão e data registradas.
- Todos os inscritos recebem contato humano. A inscrição não garante uma das cinco vagas.
- Lista privada `/plataforma/inscricoes-teste`, exclusiva da plataforma, com paginação, abertura do WhatsApp e marcação do contato realizado.
- As inscrições pertencem à plataforma, antes de existir uma empresa. Empresas e professores autenticados não têm acesso a essa lista.
- A página funciona também no navegador do celular. Não adiciona uma tela ao aplicativo operacional de alunos.

## Validação em 28/10/2026

- Quatro testes automatizados de validação passaram: celular/DDD, e-mail, consentimento, disponibilidade, limites e quantidade de alunos.
- Conferência visual local em 1440 × 1080 e 390 × 844, sem rolagem horizontal.
- Teste no navegador com respostas simuladas: preserva dados no erro e mostra a confirmação no sucesso. Essa simulação não comprova gravação no banco.
- HTTP local: JSON inválido 400, campos ausentes 400, origem externa 403, corpo excessivo 413, honeypot 201 sem persistência e lista privada sem sessão bloqueada por redirecionamento 307.
- A senha do banco dev falhou com PostgreSQL 28P01 tanto localmente quanto no build do preview. Nenhuma migração foi aplicada.

## Resolução e validação completa em dev

A senha foi atualizada pelo solicitante. A conexão direta do Supabase ainda retornava P1001 na publicação Git real. O commit `7e9fca6` adicionou a opção explícita `DATABASE_POOLER_HOST`, configurada somente em Preview/dev, para preservar a senha e utilizar o pooler IPv4. Produção não recebeu essa configuração e mantém as validações anteriores.

O banco dev tem referência `qsxnxvcwimupyenmigzd`. Após autorização explícita para uma execução pontual, o commit `914d822` executou a preparação e a validação na publicação `https://edugestao-bj4p-d4zkhdqbj-edugestao-s-projects.vercel.app`, em estado Ready. A configuração temporária de build foi retirada após a execução. Nenhuma variável permanente de migração foi criada.

Evidências do build em 28/10/2026 (UTC):

- 20:24:19: destino Preview/dev confirmado e única migração pendente no escopo: `20261028120000_inscricoes_teste`.
- 20:24:23: `prisma migrate deploy` concluiu a criação da tabela e índices.
- 20:25:02: testes reais de HTTP e PostgreSQL confirmaram inscrição persistida, consentimento registrado, disponibilidade falsa preservada, repetição sem duplicação, lista bloqueada sem sessão, consulta com sessão sintética da plataforma e marcação de contato persistida.
- 20:25:02: registro fictício removido por nome e e-mail únicos desta execução. Consulta posterior confirmou ausência do registro.
- 20:25:10: publicação em estado Ready.

Os testes usaram um servidor Next.js no próprio ambiente de build, o código compilado do projeto e o banco dev real. O cookie sintético da plataforma teve duração de dois minutos e permaneceu somente em memória nesse processo de testes. Nenhum usuário foi criado e nenhum e-mail ou WhatsApp foi enviado. Os testes de validação e da configuração de conexão somaram 12 casos aprovados.

A página de inscrição e a lista privada estão validadas no dev. O link público de campanha em produção ainda exige a promoção autorizada. A conexão local antiga não foi atualizada automaticamente, pois a senha sensível nova ficou somente na Vercel.

Os scripts manuais mantêm bloqueios de ambiente, branch e destino. O build normal não os executa. Não habilitar migração automática em produção.

## Produção

Exige validação real no dev e autorização explícita para promover os commits desta mudança. A migração cria apenas a tabela `inscricoes_teste` e índices. Não modifica usuários, empresas ou dados operacionais existentes. Não envia WhatsApp automaticamente e não cria contas para candidatos.

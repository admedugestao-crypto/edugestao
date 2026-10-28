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

## Pendência para receber inscrições

Corrigir `DATABASE_URL` da configuração Preview vinculada a `dev`, usando a credencial atual do banco dev, e atualizar a configuração local privada. As variáveis são sensíveis na Vercel e não podem ser recuperadas por `env pull`.

O banco dev identificado tem referência `qsxnxvcwimupyenmigzd`. O script `scripts/preparar-inscricoes-dev.cjs` recusa outros destinos, exige Preview e `EG_V2_APLICAR_MIGRACAO_DEV=1`, verifica o histórico e permite somente a migração `20261028120000_inscricoes_teste`. Não habilitar esse script como build automático de produção.

Após corrigir a conexão: conferir pendências, executar `prisma migrate deploy` em dev, testar cadastro sintético, repetição sem duplicata, limite por origem e acesso à lista privada. Remover somente os dados sintéticos criados nessa verificação.

O link de preview serve para revisão visual até concluir esse teste real. Não divulgar a página para captação antes disso.

## Produção

Exige validação real no dev e autorização explícita para promover os commits desta mudança. A migração cria apenas a tabela `inscricoes_teste` e índices. Não modifica usuários, empresas ou dados operacionais existentes. Não envia WhatsApp automaticamente e não cria contas para candidatos.

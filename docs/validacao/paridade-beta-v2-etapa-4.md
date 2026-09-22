# Etapa 4 — homologação em andamento

Atualizado em 22/09/2026. Ambiente: KCF no Preview dev. Base publicada dos testes: 06a3c35 (dpl_9fEJmgmheQMAxGbYFwCshCV8DwDj).

## Escopo e autorização

O usuário confirmou banco separado no dev e autorizou utilizar KCF. Sessão operacional: Administrador/Professor. O usuário não sabe se existem contas dos demais perfis; a matriz de autorização permanece pendente. Foram criados somente registros fictícios identificados por TESTE ETAPA4. Nenhum cadastro preexistente foi alterado, nenhum e-mail/WhatsApp enviado e produção não foi publicada.

## Validações realizadas pela interface publicada

- Escola TESTE ETAPA4 20260921 Escola e primeira unidade TESTE ETAPA4 Unidade: criação, recarga e releitura confirmadas.
- Aluno TESTE ETAPA4 20260921 Aluno (cmubw4u63000204jjqim6cv6m): cadastro persistido, ficha com nascimento 15/01/2016, contrato 21–30/09/2026, mensalidade R$ 10,00, dia 30 e observações corretas. Sem agenda fixa; contato fictício etapa4@example.invalid e telefone 00000000000.
- Avaliação passada de Matemática em 20/09/2026: criação e persistência. Nota 11 recusada para máximo 10; nota 8 aceita e preservada após recarga.
- Aula fictícia individual 21/09/2026, 14h–15h, Matemática: aviso de data passada, criação e navegação para detalhe corretos. Marcar Realizada abriu o formulário de conteúdo com aluno, data e matéria preenchidos.
- Conteúdo TESTE ETAPA4 — conteúdo da aula realizada: gravado como Ministrado; após recarga, vínculo da aula exibiu Realizada. Antes da recarga, a linha ainda mostrava Agendada: pendência de atualização visual imediata, sem inconsistência persistida comprovada.
- Cobrança automática da aula: exatamente uma mensalidade de R$ 10,00, vencimento 30/09/2026; baixa fictícia exibiu Pago em 22/09/2026 e total recebido R$ 10,00. Recibo mostrou aluno, competência, uma aula, valor e datas corretos. Desmarcar pagamento restaurou A vencer, sem data de pagamento, recebido zero e pendente R$ 10,00; estado mantido após recarga.
- Biblioteca: criado TESTE ETAPA4 20260922 Material, SAS, 2º ano, Matemática, com PDF fictício de uma página. Upload, gravação, busca e edição da descrição passaram; edição confirmada após recarga.
- Download do PDF: HTTP 200, application/pdf, 969 bytes, uma página, bytes idênticos ao arquivo original. Evidência: work/etapa4/download-material.json. O visualizador PDF do navegador Codex ficou vazio; não considerar renderização visual aprovada.
- Responsividade em viewport solicitado 390x844: biblioteca e financeiro sem transbordamento horizontal do documento (clientWidth=scrollWidth=375). Financeiro tem rolagem horizontal interna na tabela. Isso é teste web responsivo, não teste de app nativo ou cobertura completa mobile.
- 14 URLs sem sessão (10 páginas V2 e 4 APIs GET) encaminharam ao login com HTTP 307; evidência work/etapa4/acesso-sem-sessao.json. Não comprova autorização entre perfis/empresas.

## Defeito encontrado e correção

Ficha de impressão compartilhada pelo dashboard e V2 exibia nascimento 14/01/2016 em vez de 15/01/2016. A conversão usava o fuso local sobre meia-noite UTC. Corrigida a formatação de nascimento com timeZone UTC, sem alterar data de emissão. Teste de regressão renderiza a ficha em São Paulo, Manaus, Honolulu e Kiritimati, incluindo virada de mês. Publicação e reteste remoto da correção devem ser registrados abaixo.

## Pendências para aceite integral

- Matriz de perfis e isolamento entre empresas/professores: contas controladas ainda não disponíveis.
- Login: preservar destino /v2 após autenticação; inspeção encontrou retorno fixo para /dashboard ou /m.
- Conteúdo: atualizar imediatamente o status exibido da aula após salvar (atualmente exige recarga).
- Cobertura restante de agenda: feriados, disponibilidade, reposição, cancelamento, geração em lote e limites contratuais no ambiente publicado. Testes automatizados da etapa 3 não equivalem à homologação de todos esses fluxos.
- Cobertura adicional: foto/edição completa do aluno, união de arquivos, vínculo da biblioteca ao conteúdo, exclusão controlada, todas as modalidades financeiras e preservação de quitados no fluxo publicado.
- Integrações: Blob e SMTP têm escopos Preview/Production compartilhados. Não foram enviados avisos; canais/destinatários controlados precisam ser definidos antes de testes reais de e-mail/WhatsApp.
- Android: adb não encontrou aparelho/emulador. capacitor.config.ts aponta ao alias antigo git-codex-v2; alinhar e sincronizar antes de teste nativo. iOS exige macOS.

Os registros fictícios permanecem no dev para continuidade/rastreabilidade. Etapa 4 não concluída e V2 não aprovada para substituição integral da Beta.

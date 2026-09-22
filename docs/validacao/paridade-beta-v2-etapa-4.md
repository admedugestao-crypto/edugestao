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

## Validação local da correção em 22/09/2026

Commit 29019fe (somente dev): regressão da ficha aprovada nas oito combinações de data/fuso; TypeScript sem erros; ESLint do componente sem ocorrências; build Next webpack concluído. Aviso preexistente: convenção middleware descontinuada em favor de proxy. Sem migração, mudança de variável ou configuração de cron.

## Reteste publicado

Preview dpl_CjAGfic3nPNeDgAnYNCZvJBL6c4c Ready em 22/09/2026, URL https://edugestao-bj4p-74hgns35j-edugestao-s-projects.vercel.app. Alias git-dev associado explicitamente a esse Preview. Após recarregar /v2/alunos/cmubw4u63000204jjqim6cv6m/imprimir na sessão autenticada, nascimento exibido corretamente como 15/01/2016. Defeito da data corrigido e retestado no dev. Produção permanece inalterada.

## Perfil Professor — sessão real em 22/09/2026

Login confirmado como Daniel de Castro (Professor), KCF, em dev. Lista V2 mostra zero alunos vinculados. Acesso direto ao aluno fictício da Karin retorna 404; impressão retorna Aluno não encontrado. Financeiro filtrado pelo ID desse aluno não revela nome, cobrança ou valores (totais zero) e não oferece botão Novo. Conteúdos não mostra registros da Karin; seletor de notas não oferece alunos dela. Verificado isolamento de leitura nessas telas; não equivale a teste de todas as mutações de API. Mensagem vazia do financeiro cita Novo mesmo quando o botão não existe para Professor: ajuste de texto pendente. Cadastro e fluxo com aluno próprio de Daniel ainda pendentes. Administrador puro depende de sessão da conta admin KCF, que estava inativa na imagem fornecida; perfil combinado Karin já validado nos fluxos anteriores.

## Perfil Administrador puro — sessão real em 22/09/2026

Usuário admin KCF confirmado no dashboard com perfil Administrador. A ficha do aluno fictício vinculado à Karin abre normalmente na V2; impressão também permitida e nascimento correto (15/01/2016). Notas lista os seis alunos da empresa e permite consultar a nota fictícia 8 em Matemática. Financeiro mostra a cobrança de R$ 10,00 e ações administrativas. Baixa executada somente nessa cobrança fictícia: Pago, data 22/09/2026, recebido R$ 10,00, persistindo após recarga. Desmarcar restaurou A vencer, sem data de pagamento, recebido zero e pendente R$ 10,00. Não houve envio de mensagem nem alteração de cadastro real. Os testes comparados com Daniel comprovam diferenças de leitura e a mutação financeira autorizada do Administrador neste cenário; não cobrem todas as rotas, isolamento entre empresas ou fluxo do Professor com aluno próprio.

## Professor com aluno próprio — Carlos (22/09/2026)

Sessão Daniel de Castro confirmada, dashboard com um aluno. Carlos Manoel Rodrigues (cmucphmfv000004kz8htw83d1) abre normalmente na ficha V2 e no formulário de edição; vínculo Daniel confirmado. Edição aberta sem salvar alterações no cadastro. Notas oferece somente Carlos e sua avaliação de Geografia; nenhuma nota foi alterada. Financeiro identifica Carlos, sem cobranças e sem botão de criação manual. Conteúdos oferece somente Carlos; criado TESTE ETAPA4 — planejamento do Professor, explicitamente fictício e Planejado, persistido após recarga. Não houve aula marcada como ministrada nem envio de mensagens.

Pendência observada: formulário de conteúdo informa Nenhuma matéria disponível apesar de Geografia na ficha; o planejamento foi salvo como Todas as matérias. Inspeção das páginas dashboard e V2 mostra que ambas derivam as disciplinas das aulas da agenda, não diretamente do vínculo do aluno. É necessário validar o comportamento após aula vinculada e decidir o comportamento desejado para planejamento antes da primeira aula. Não foi comprovada regressão exclusiva da V2. Testes de acesso e gravação de planejamento passaram; fluxo completo agenda/nota/cobrança do Professor ainda não aprovado.

## Ajuste solicitado: disciplinas de planejamento sem agenda

Em 22/09/2026 o usuário esclareceu que o conteúdo planejado sem aula vinculada deve buscar as disciplinas no cadastro do aluno. Commit dev ccf1f1c: páginas V2, dashboard e mobile passam a carregar AlunoMateria, eliminando a união de disciplinas de todas as aulas. Disciplinas selecionadas vindas da agenda e registros antigos continuam preservadas pelo mecanismo existente de opções selecionadas. Sem migrações ou alterações em dados existentes. TypeScript e build webpack aprovados; lint apresenta somente no-explicit-any preexistente na página mobile, confirmado no HEAD anterior. Reteste publicado pendente nesta seção.

O reteste de ccf1f1c confirmou Geografia no seletor de Carlos, mas revelou que PUT ainda exigia agenda para edição planejada independente. Corrigido em cd2ee03: validarAgenda libera planejado sem aulaId; vínculos explícitos e ministrados continuam validados. Dois testes de regressão passaram, TypeScript e lint do helper passaram. Registros existentes não foram migrados.

Reteste final aprovado no dev: Preview dpl_6PTdeAJKwae8Lm8vzEzajwyYfKd8 Ready (cd2ee03), alias git-dev confirmado. Daniel editou o planejamento fictício de Carlos sem vínculo de agenda, selecionou Geografia do cadastro e salvou com sucesso. Após recarga, conteúdo permaneceu Planejado e Geografia persistiu. Build final aprovado. Produção inalterada.

## Continuação autorizada — todos os processos exceto Notificações (22/09/2026)

Esta seção atualiza as pendências históricas acima. O usuário autorizou testar Carlos, criado por ele e vinculado a Daniel, no banco dev separado. Notificações estão fora do escopo; não houve envio de e-mail/WhatsApp.

### Interface publicada (base cd2ee03)

- Carlos: planejamento independente convertido em Ministrado ao realizar aula em 22/09, 08h–09h. Registro reaproveitado, Geografia mantida, uma cobrança automática de R$ 150,00 com vencimento 30/09. Professor sem ações de baixa/edição/exclusão financeira.
- Agenda: aula fictícia de 21/09 criada com confirmação de data passada, cancelada e alterada para Falta do professor. Fluxo Excluir > Sim, será reposta gerou reposição em 28/09, 08h–08h30, com identificação de reposição e bloqueio de realização futura. A aula original saiu da agenda. Esse fluxo criou cobrança separada Rep. Aula de R$ 150,00 vencendo em 21/09; Carlos ficou com R$ 300,00 em duas cobranças de teste. Comportamento registrado, sem presumir que essa regra de reposição esteja aprovada para todos os cenários.
- Conteúdo TESTE ETAPA4 — união de arquivos: dois PDFs fictícios selecionados e unidos, gravação persistida; download HTTP 200 e análise pdf-lib confirmou duas páginas.
- Conteúdo TESTE ETAPA4 — material da biblioteca: seleção do material fictício já cadastrado, arquivo e descrição vinculados, gravação confirmada.
- Foto: quadrado azul fictício de 240x240 enviado para Carlos. Cadastro salvo e recarregado; foto carregada (naturalWidth/naturalHeight=240), responsável/e-mail/endereço/professor/contrato preservados. Leitura automatizada ocultava o valor do input de e-mail; screenshot confirmou preenchimento, portanto não era defeito do produto.

### Ajustes e validação local

- Login passa a preservar callback interno /v2 e sua consulta. Destinos externos, barras invertidas e caminhos fora de /v2 rejeitados. Autenticação real posterior ainda depende de nova sessão do usuário.
- Conteúdo criado a partir de aula atualiza o cartão para Realizada após PATCH bem-sucedido e fecha o formulário.
- Mensagem de financeiro vazio só cita Novo para perfis com essa ação.
- Capacitor V2 Dev aponta ao alias git-dev, substituindo git-codex-v2 desatualizado. cap sync android e ios concluídos. Isso não comprova execução nativa; adb devices sem aparelho/emulador, e build iOS depende de macOS.
- 12 testes passaram: dois de planejamento sem agenda, dois de callback seguro e oito do motor (mensal, duas quinzenas, semanal cruzando mês, por aula, limites contratuais, status e preservação de quitado). São testes locais com banco simulado, não homologação de cada modalidade na interface publicada.
- Build Next webpack e TypeScript passaram. Lint dos novos arquivos de login passou; comparação dos componentes alterados contra HEAD não adicionou ocorrências às existentes. Sem migrações, variáveis ou cron alterados.

### Pendências reais após esta rodada

- Reteste publicado dos ajustes desta rodada; autenticação completa com retorno à V2 após login.
- Agenda: geração em lote, feriados/disponibilidade e limites contratuais em cenários publicados adicionais; reposição realizada sem duplicar cobrança.
- Outras modalidades financeiras e preservação de quitados também pela interface, além dos testes locais.
- Isolamento entre empresas e perfil Auxiliar dependem de contas/sessões controladas; não foram criadas permissões nem redefinidas senhas.
- Exclusão permanente controlada e teste nativo em dispositivo ainda não concluídos.

Etapa 4 permanece parcial. Produção não foi alterada. Os registros de teste permanecem identificados no dev.

# Etapa 4 — homologação em andamento

Atualizado em 24/09/2026. Ambiente: KCF no Preview dev. Base publicada dos testes: 06a3c35 (dpl_9fEJmgmheQMAxGbYFwCshCV8DwDj).

## Escopo e autorização

O usuário confirmou banco separado no dev e autorizou utilizar KCF. Sessão operacional: Administrador/Professor. O perfil Auxiliar foi dispensado pelo usuário e não faz parte do aceite. Foram criados registros fictícios identificados por TESTE ETAPA4/HML. Nenhum e-mail/WhatsApp foi enviado e produção não foi publicada.

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

## Reteste do Preview c4d9d5e — 22/09/2026

Deployment dpl_7YYY1Xtp1WbmMMdJCY9QLP6t766d Ready; URL https://edugestao-bj4p-9y3qp9ai9-edugestao-s-projects.vercel.app. Alias git-dev explicitamente associado. Produção permanece inalterada.

- Nova aula fictícia Carlos 21/09, 10h–11h, realizada com novo conteúdo TESTE ETAPA4 — status imediato após salvar. Antes de qualquer recarga, cartão exibiu Ministrado e vínculo Realizada, formulário fechado e aviso de cobrança R$ 150,00 vencendo em 30/09. Correção de atualização imediata APROVADA.
- Financeiro Professor após reteste: três parcelas, R$ 450,00 pendentes (duas automáticas e uma Rep. Aula). Sem ações de baixa, edição ou criação manual. Nenhum e-mail enviado.
- GET sem sessão /v2/conteudos?aluno=teste respondeu HTTP 307 para /login?callbackUrl=%2Fv2%2Fconteudos%3Faluno%3Dteste. Redirecionamento inicial APROVADO; autenticação completa depende de entrada do usuário.
- Gerar agenda como Daniel: aulas recorrentes de Carlos presentes em 05, 19 e 26/10; 12/10 preservado como feriado sem aula. Em dezembro, aulas em 07 e 14/12; 21 e 28/12 vazios, respeitando término contratual em 14/12. Segunda geração informou 12 ignoradas (existentes ou datas indisponíveis), sem novas aulas. Geração, feriado nacional, limite final e repetição APROVADOS nesse cenário.
- Nova aula comum de 30 minutos rejeitada. Sábado 26/09 22h–23h mostrou aviso de professor sem disponibilidade; inclusão cancelada. Observação menor: aviso anterior de duração permaneceu junto à confirmação de indisponibilidade mesmo após corrigir para uma hora. Nenhuma aula criada nesse cenário.
- Usuário autorizou expressamente excluir TESTE ETAPA4 — material da biblioteca. Exclusão pela interface confirmada após recarga. Biblioteca ainda contém TESTE ETAPA4 20260922 Material e seu arquivo. Exclusão controlada APROVADA.

Pendências atualizadas: login completo com nova sessão; modalidades financeiras e quitados pela interface administrativa; outras empresas/Auxiliar com sessões controladas; execução nativa em aparelho/emulador; reposição realizada sem duplicação (a reposição atual é futura e o sistema corretamente bloqueia realização). Notificações excluídas por solicitação. A mensagem residual de duração no formulário de agenda é uma pendência visual menor registrada. Testes locais não substituem essas verificações publicadas.

## Homologação financeira adicional — cobrança semanal no DEV (24/09/2026)

No Preview associado ao alias `git-dev`, sessão KCF como Karin de Castro Figueiredo, foi validado pela interface o fluxo de uma aula semanal para o aluno fictício TESTE ETAPA4 20260921 Aluno (ID `cmubw4u63000204jjqim6cv6m`). O cadastro estava configurado como semanal, vencimento às segundas-feiras, R$ 13,00, contrato de 21 a 30/09/2026.

- Criada aula fictícia de Matemática em 24/09/2026, 08h–09h, com observação HML. Após o aviso de horário passado para a data atual, foi confirmada a inclusão conforme autorização do usuário.
- Conteúdo fictício `HML V2 — aula semanal 24/09` registrado como Ministrado; a aula passou a Realizada e a interface confirmou cobrança automática de R$ 13,00, vencimento em 28/09/2026.
- No Financeiro V2 de setembro, a nova cobrança aparece como Automática, Semanal, R$ 13,00, vencimento 28/09, A vencer. Total esperado: R$ 485,00; recebido: R$ 10,00; pendente: R$ 475,00; 6 parcelas.
- As cobranças de teste anteriores foram preservadas: R$ 12,00 A vencer (25/09) e R$ 10,00 Pago (baixa em 22/09). O registro pago permaneceu inalterado após a geração da nova cobrança.
- Registros de Carlos e contatos reais não foram alterados. Nenhum e-mail/WhatsApp foi enviado. Produção permanece inalterada.

Resultado: cobrança semanal automática e preservação da parcela quitada APROVADAS neste cenário publicado. Ainda faltam testes de interface para as demais modalidades financeiras; testes locais do motor não substituem essa cobertura. Os registros HML permanecem no DEV para rastreabilidade.

## Homologação pela interface das modalidades Quinzenal e Por aula — 24/09/2026

Com autorização do usuário, foi alterada somente a configuração de cobrança do aluno fictício TESTE ETAPA4 20260921 Aluno no DEV. Após os dois casos, a configuração do cadastro foi restaurada para Semanal, segunda-feira, R$ 13,00.

- Quinzenal: configuração de vencimentos nos dias 10 e 25, valor R$ 13,00. Aula fictícia de Matemática em 23/09/2026, 08h–09h, marcada Realizada com conteúdo HML. A interface confirmou uma cobrança automática de R$ 13,00 com vencimento em 25/09/2026.
- Por aula: valor de R$ 13,00 por aula. Aula fictícia de Matemática em 23/09/2026, 10h–11h, marcada Realizada com conteúdo HML. A interface confirmou uma cobrança automática de R$ 13,00 com vencimento em 30/09/2026.
- Configuração restaurada e conferida na ficha: Semanal, segunda-feira, R$ 13,00. As cobranças antigas permaneceram: R$ 12,00 A vencer (25/09) e R$ 10,00 Pago (30/09, baixa em 22/09). As três cobranças HML recém-geradas também permaneceram pendentes: Semanal R$ 13,00 (28/09), Quinzenal R$ 13,00 (25/09), Por aula R$ 13,00 (30/09). Nenhuma parcela paga foi alterada.
- Financeiro após os testes: 8 cobranças no mês, total esperado R$ 511,00, recebido R$ 10,00, pendente R$ 501,00. O total inclui os registros de homologação anteriores de Carlos, que não foram alterados nesta rodada.
- Observação da interface: depois de restaurar o perfil Semanal, a coluna “Tipo” das cobranças antigas e das três novas exibe “Semanal”. Os avisos de geração durante cada caso confirmaram os vencimentos calculados, mas a lista aparenta apresentar a modalidade atual do aluno, sem preservar a modalidade usada quando cada cobrança foi criada. Registrar como ponto de produto a decidir se o histórico deve guardar/exibir a modalidade de origem.
- Observação de agenda durante o processo: as aulas HML de 23/09 aparecem na grade mensal e semanal, mas a vista diária selecionada em 23/09 chegou a mostrar zero aulas. A ocorrência precisa de reteste específico; não foi necessária para verificar os avisos de geração financeira.

Resultado: geração automática MENSAL (reteste anterior), SEMANAL, QUINZENAL e POR_AULA validada pela interface em cenários controlados no DEV. Preservação da cobrança paga confirmada. Nenhum contato real foi modificado ou notificado; produção permanece inalterada.

Na conferência final com o filtro no aluno HML, o Financeiro mostrou 5 parcelas, total esperado R$ 61,00, recebido R$ 10,00, pendente R$ 51,00 e nenhum atraso. A página Financeiro DEV ficou aberta com esse filtro aplicado.

Reteste somente de leitura no Financeiro V2 em 24/09, como Karin/KCF: a tabela mostra 8 cobranças; as cobranças HML geradas em modo Semanal, Quinzenal e Por aula aparecem todas com `Tipo = Semanal` após a restauração da configuração do aluno. A cobrança `Rep. Aula` de Carlos aparece com `Tipo = Mensal` e `Geração = Rep. Aula`. A discrepância registrada antes persiste no Preview. Não havia cobrança manual comum disponível para confirmar visualmente o rótulo `Cobr. Manual`; esse caso continua pendente. Nenhuma ação financeira foi executada nesta conferência.

## Reteste da vista diária da agenda em 23/09 (24/09/2026)

Na sessão KCF do Preview DEV, a grade mensal e a vista semanal exibem as duas aulas HML do aluno `TESTE ETAPA4 20260921 Aluno` em 23/09/2026, às 08h e 10h, ambas Realizadas. Na navegação para a vista diária, a primeira leitura após mudar de 24/09 para 23/09 mostrou temporariamente “0 aula(s)”. Depois de aguardar o conteúdo específico, a vista diária exibiu as duas aulas, com conteúdo, matéria, horários e status Realizada corretos. Após recarregar a página e repetir, ocorreu o mesmo padrão: estado vazio imediato seguido por duas aulas carregadas.

Resultado: os dados existem na vista diária, mas há uma condição visual transitória em que “Nenhuma aula agendada” aparece antes de a consulta terminar. A correção local para distinguir carregamento de zero resultados ainda não está no Preview. Retestar após a publicação ao final do processo.

Reprodução adicional em nova aba autenticada no mesmo Preview (24/09): Agenda abriu em Mês; após selecionar Semana, a grade exibiu as aulas de 23/09; ao selecionar Dia e voltar para 23/09, a primeira leitura voltou a mostrar zero. Na leitura seguinte, a tela exibiu as duas aulas HML Realizadas, às 08h e 10h, com conteúdos. A condição de carregamento transitório foi reproduzida novamente sem alteração de dados.

## Preferência de entrada da agenda — semana (24/09/2026)

Definido que a Agenda deve abrir na semana atual. Implementado no desktop V2 e no mobile V2: desktop inicia em Semana; mobile inicia numa nova visão-resumo dos sete dias, com Dia e Mês disponíveis como vistas alternativas. O perfil mobile legado mantém a abertura diária.

Verificação local: TypeScript passou; ESLint do componente mobile passou. A tentativa adicional de build foi interrompida pelo Windows ao tentar remover o item somente-leitura/reparse point `.next/static/71a6Y1LptVOFyHcIg4PzD` (EPERM). O build anterior, antes deste ajuste de tela, havia passado; repetir build e validar visualmente no Preview ficam para a etapa final, sem publicação nesta rodada.

Reteste de referência no Preview DEV em 24/09: após recarregar `/v2/agenda`, a vista selecionada inicialmente foi Mês, não Semana. O comportamento publicado ainda não atende ao padrão solicitado; a implementação local permanece para validação após a publicação reservada ao final.

## Reposição — prevenção de cobrança duplicada (24/09/2026)

Revisão do fluxo encontrou a causa: `/api/agenda/[id]/repor` cria a cobrança manual da aula original e marca a aula substituta com `reposicao=true`, mas a geração automática imediata ao marcar Realizada não consultava esse indicador. O motor agora exclui reposições da cobrança automática.

Verificação local da regra: 3 casos passaram — reposição Realizada não é elegível; aula comum Realizada e Falta do Aluno continuam elegíveis; aula Agendada permanece sem cobrança. TypeScript e ESLint dos arquivos da regra passaram.

O teste de ponta a ponta no registro HML permanece pendente para a validação final do Preview. A reposição existente é de Carlos, em 28/09/2026, 08h–08h30; segue futura nesta data e não foi alterada. A automação do Edge interrompeu a inspeção, e a publicação está reservada para o fim. Nenhuma aula foi marcada como Ministrada nem e-mail foi enviado; produção não foi alterada.

## Retorno à V2 após novo login — 24/09/2026

Teste manual acompanhado pelo usuário no Preview DEV: após sair, acessar a URL completa `https://edugestao-bj4p-git-dev-edugestao-s-projects.vercel.app/v2/pagamentos` e autenticar novamente, a tela Financeiro V2 carregou na rota `/v2/pagamentos`. Captura enviada pelo usuário confirma a página autenticada, sem redirecionamento para Dashboard. Resultado: retorno à rota V2 APROVADO. A automação do Edge permaneceu indisponível; a validação foi visual/manual. Nenhuma alteração publicada.

## Isolamento entre empresas — pendente

O usuário dispensou o teste do perfil AUXILIAR; ele não faz parte do aceite desta etapa. Os testes anteriores de Professor e Administrador cobrem somente a empresa KCF. A sessão HML foi criada e testada abaixo; permanece pendente completar a direção inversa e testar mutações entre empresas.

Em 24/09/2026, com autorização do usuário, criada pela Plataforma no DEV a empresa fictícia `HML Isolamento V2 20260924`, slug `hml-isolamento-v2-20260924`, e seu primeiro administrador `HML Isolamento DEV` (`hml.isolamento.v2.20260924@example.invalid`). A lista de Empresas confirmou a empresa ativa; a lista de Usuários confirmou o administrador ativo e vinculado ao tenant. O login dedicado foi concluído e a sessão atual está autenticada nesse tenant. Nenhum endereço, telefone ou contato real foi usado e nenhum e-mail enviado.

- Criadas no tenant HML a escola fictícia `HML Isolamento Escola 20260924` e a unidade `Unidade HML Isolamento`.
- A lista de alunos da sessão HML retornou zero registros. A consulta direta pelo ID do aluno fictício KCF `cmubw4u63000204jjqim6cv6m` retornou HTTP 404 (`Não encontrado`). Resultado: o HML não consegue ler esse registro de outra empresa.
- Não foi persistido aluno de teste HML: o formulário exige professor vinculado antes de salvar e o rascunho foi cancelado. A leitura inversa pela lista de escolas KCF foi testada depois e não revelou a escola HML. Como não há aluno HML persistido nem rota GET individual para escola, a consulta individual inversa segue indisponível; mutações entre empresas continuam pendentes.
- Nenhuma empresa ou cadastro preexistente foi alterado; a escola e a unidade HML permanecem como dados fictícios de referência no DEV.

Na retomada, a sessão KCF foi confirmada como Karin de Castro Figueiredo, perfil Administrador/Professor. A leitura autenticada de `/api/escolas` no Preview retornou somente quatro escolas vinculadas à empresa KCF e não incluiu a escola HML `cmug84vrf000004l6v6svtq4h`. Resultado: leitura pela listagem KCF → HML não expõe a escola de outra empresa. Não foi possível testar consulta individual porque a API de escola não oferece GET por ID, nem executar mutações cruzadas pela interface. Nenhum dado foi alterado. Revisão estática dos handlers locais encontrou checagem de `empresaId` antes de mutações por ID em aluno (PUT/DELETE), escola (PUT/DELETE), agenda (PUT/DELETE) e pagamento (PATCH/DELETE). A leitura da listagem é evidência de runtime; a revisão dos handlers não é evidência de mutação no Preview. Permanecem pendentes as tentativas reais de alteração cruzada.

## Retomada da homologação — cobrança manual e recuperação da baixa (24/09/2026)

Na tentativa de homologar o rótulo da cobrança manual, o formulário Novo foi submetido usando a mesma chave aluno/mês/ano/parcela de uma cobrança automática já paga do aluno fictício HML. A API fez upsert nessa chave e alterou o registro existente em vez de criar uma nova cobrança. A interface exibiu saldo incompatível durante a tentativa. O registro de teste foi restaurado para R$ 10,00, Pago, sem observação; a data de baixa original 22/09/2026 também foi restaurada e confirmada visualmente na lista. Os agregados retornaram a R$ 511,00 esperado, R$ 10,00 recebido e R$ 501,00 pendente, em 8 cobranças.

Resultado inicial: a tentativa de reutilizar parcela 1 colidiu com a cobrança automática, que foi integralmente restaurada. Em seguida, criada uma cobrança manual separada na parcela 9 do mesmo aluno fictício: R$ 13,00, vencimento 30/09, observação HML. A interface lista `Geração = Manual`, mas `Tipo = Semanal`; o requisito esperado é `Tipo = Cobr. Manual`. Portanto, o fluxo cria e identifica a origem manual, porém falha no rótulo de tipo. A parcela dedicada permanece no DEV para rastreabilidade; os totais de setembro agora são R$ 524,00 esperado, R$ 10,00 recebido e R$ 514,00 pendente, em 9 cobranças. Nenhum contato foi notificado e produção não foi alterada.

## Tipo de cobrança por parcela — implementação local (25/09/2026)

Adicionado ao modelo `Pagamento` o campo opcional `tipoCobrancaGerada`, com migração aditiva. A geração automática grava a modalidade do aluno no momento da criação e atualiza a cópia quando recalcula uma cobrança automática ainda não paga; geração de reposição também guarda a modalidade vigente. Financeiro V2 e recibos passam a ler esse campo. Cobranças manuais comuns continuam usando o rótulo `Cobr. Manual`.

Cobranças anteriores à migração não têm histórico confiável dessa modalidade. A interface exibirá `Não registrado` em vez de inferir a configuração atual do aluno. Reteste da migração e das novas gerações no Preview DEV pendente, reservado para a etapa final. Nenhuma migração foi aplicada a banco remoto e não houve publicação.

## Reposição realizada — regressão do fluxo local (25/09/2026)

Executados os handlers reais POST `/api/agenda/[id]/repor` e PATCH `/api/agenda/[id]`, juntamente com o motor real de cobrança, usando persistência simulada em memória. Teste em `tests/reposicao-fluxo.test.cjs`.

- Aula original fictícia em Falta do Professor foi substituída por uma reposição de 30 minutos.
- A criação da reposição gerou uma única cobrança de R$ 13,00, com origemReposicao=true.
- Registrado conteúdo planejado para a reposição; PATCH Realizada converteu o conteúdo para ministrado e confirmou status REALIZADA.
- Antes da realização: 1 cobrança / R$ 13,00. Depois: 1 cobrança / R$ 13,00, com o registro integralmente inalterado.
- Repetição do PATCH Realizada: novamente 1 cobrança / R$ 13,00; sem pagamentoGerado, aviso de erro ou vínculo financeiro adicional.
- Suíte financeira e teste de fluxo: 10 testes aprovados. O carregador dos testes foi corrigido para importar o helper real de elegibilidade, em vez de simular todos os imports como Prisma.
- TypeScript e build Next webpack concluídos. Ajustada allowImportingTsExtensions para os testes TypeScript existentes, mantendo noEmit.

Resultado: prevenção de duplicidade APROVADA NO CÓDIGO LOCAL, com persistência simulada. Não representa teste autenticado no Preview. A correção permanece local, sem publicação nesta rodada.

Impedimentos para homologação remota: Edge bloqueou novamente a automação por interface de outra extensão; a exportação das variáveis Preview da branch dev retornou DATABASE_URL vazia. Portanto, não houve conexão ao banco remoto nem execução da transação real inicialmente planejada. Nenhuma aula, conteúdo ou cobrança remota foi alterada, e nenhuma notificação foi enviada. Permanece pendente realizar e comparar a reposição no Preview após publicação da correção e restabelecimento do acesso.

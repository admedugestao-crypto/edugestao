# Etapa 3 — correções funcionais

21/09/2026. Base: dev 960c430. Produção não alterada.

## Correções

- F01: fotos externas sem otimização em ficha, formulário e impressão, mantendo armazenamento Blob.
- F02: remoção de rascunhos incompletos é local; remoção de faixas completas e salvamento continuam sujeitos à proteção do servidor.
- H01: geração não cria aulas fora da disponibilidade configurada nem em feriados da mesma base usada no calendário (incluindo locais). Datas normalizadas em UTC, com dia atual de Brasília. Horários legados inválidos não entram em laço infinito. Sem disponibilidade cadastrada mantém comportamento anterior.
- H02: contrato conferido por dia; valores negativos/não finitos e datas impossíveis recusados; POST de pagamento aplica o bloqueio de baixa com aula agendada. Dia mensal/quinzenal limitado ao último dia do mês; semanal avança ao próximo dia configurado mesmo no mês seguinte. Essas regras de vencimento foram propostas ao usuário e adotadas como premissa explícita em dev, sem resposta diferente até a implementação. Pagamentos quitados não são recalculados. Não houve reparação de cobranças antigas.
- H03: servidor valida valor da nota e coerência de unidade, série, disciplina e matrícula do aluno; consulta sem professor vinculado não abre escopo global.
- H04: escola e primeira unidade criadas por escrita aninhada atômica. Erro HTTP/rede preserva formulário. Biblioteca desktop/mobile preserva material e confirmação quando DELETE falha, com mensagem visível.
- H05: ficha, edição e impressão dashboard usam a mesma restrição por professor já aplicada à V2. POST/PUT de alunos validam referências da empresa antes de upload/gravação; disciplinas recebidas têm JSON validado e IDs deduplicados. GET financeiro sem professor não abre escopo global.
- H06: lembretes de aula respeitam pausa de cada canal; aluno sem telefone recebe fallback de e-mail se permitido; DDD 55 recebe código de país; seleção de amanhã usa dia de Brasília e limites UTC do campo de data.
- R02 parcial: pagamento vencido ontem passa a ser exibido como atrasado. Quantidade de bimestres não alterada, pois a regra precisa de confirmação.

## Validação

- 11 testes novos de regressão em tests/etapa3.test.cjs, 7 testes de paridade e 21 testes existentes: aprovados.
- Três fluxos no Edge headless com componentes reais e HTTP interceptado: Biblioteca DELETE 500 preserva item; escola POST 500 preserva campos e não tenta criar unidade separada; disponibilidade remove rascunho sem HTTP e preserva faixa completa quando validação falha.
- Evidências locais: work/etapa3/browser-results.json e work/etapa3/lint.json. Scripts em tests/etapa3-browser*.cjs.
- TypeScript aprovado com --allowImportingTsExtensions (testes existentes importam extensões .ts). Build Next --webpack aprovado, com aviso preexistente middleware/proxy.
- Lint comparado com HEAD por regra/arquivo: nenhuma nova ocorrência; erros preexistentes não equivalem a aprovação global.
- Falhas iniciais dos testes: seletor ambíguo de botão, ID do professor inconsistente na fixture; ambos corrigidos. Regressões de data detectadas nos testes também corrigidas antes de aprovação.

## Limites

Não foram alterados schema, migrações, variáveis ou cron. Arquivos Prisma gerados anteriormente não fazem parte desta entrega. Sem envio de e-mails/WhatsApp reais, sem teste destrutivo em banco real. Fluxos autenticados por perfil, persistência real, integrações externas e aplicativos permanecem na etapa 4. O teste de feriados usa base simulada, não homologa cobertura municipal externa.

Publicação dev e conferência do alias registradas na conclusão da tarefa. Nenhuma promoção à produção autorizada ou executada.

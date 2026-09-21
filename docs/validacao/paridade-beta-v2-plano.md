# Matriz de paridade Beta → V2 — etapa 1

Data: 21/09/2026. Escopo autorizado: diagnóstico e planejamento; nenhuma implementação ou publicação.

## Resultado e referência

**A V2 ainda não é equivalente à Beta.** Deve conservar suas melhorias e recuperar recursos, informações e caminhos de uso da Beta em produção. Equivalência funcional não exige aparência idêntica.

Referências remotas atualizadas nesta análise:

| Referência | Commit |
|---|---|
| Beta/produção, `origin/master` | `af8b61da31d8ba5dd2424cf6b3c49d4c69afd65c` |
| V2, `origin/codex/v2-financeiro-preview` | `d2f6b7e04fea91b8b26d0cf6ed1b7f85b0225ac7` |
| Beta/dev, usada apenas como conferência | `c4f35f2f95f5b5718406686df623c10def55e470` |

O status GitHub/Vercel dos commits de produção e V2 retornou `success`. Isso comprova o status dos deployments associados, não a identidade do banco, das variáveis ou do alias atualmente acessado por cada usuário.

- Deployment Beta: https://vercel.com/edugestao-s-projects/edugestao-bj4p/HiKNt3nKCPggG1gGx1BiXq6oYFkU
- Deployment V2: https://vercel.com/edugestao-s-projects/edugestao-bj4p/Aku7nVCQzbwuCk4DrhwMjxN2DzUy

A comparação principal usa objetos Git, não arquivos modificados localmente. Há alterações locais e Prisma gerado que não representam necessariamente o código publicado. Entre Beta/dev e produção, a diferença em `src` encontrada é de comentários da agenda; não usar a branch dev como substituta da referência de produção.

## Método e limites

- Inventário dos 75 arquivos diferentes entre as referências, com revisão das mudanças de schema, APIs, componentes e configuração nativa.
- Comparação das páginas `/dashboard` com suas correspondentes `/v2`; revisão das rotas mobile e das áreas compartilhadas.
- Recuperação do relatório `../../_codex_v2_abas/docs/validacao/beta-v2-2026-09-14.md`, incluindo a retomada de 21/09. Seus testes são evidências históricas com mocks; não foram reexecutados nesta etapa.
- Esta etapa não testa gravação real, integrações externas, sessões autenticadas ou aplicativos instalados. Nenhum dado de usuário foi alterado.
- “Base preservada” significa ausência de divergência relevante identificada no código examinado, e não homologação ponta a ponta.

Classificações: **preservar V2**, **recuperar Beta**, **conciliar/decidir**, **defeito V2**, **problema compartilhado** e **homologação pendente**. Prioridade P1: dados, permissões, regras e recursos essenciais; P2: informação, navegação e operação; P3: acabamento.

## Matriz por módulo

| Módulo e correspondência | Resultado da comparação | Tratamento e aceite |
|---|---|---|
| Acesso/layout: `/dashboard` → `/v2` | Autenticação e presença reutilizadas; menu, cabeçalho, marca e navegação móvel próprios. V2 acrescenta editor do ícone. | Preservar V2. Verificar login, expiração, saída, primeiro acesso e perfis sem perda de autorização. |
| Visão geral: `/dashboard` → `/v2` | V2 prioriza aulas e pendências financeiras. Não reproduz resumo/lista de notas baixas, próximas provas do professor e contador de escolas da home Beta. | Conciliar/decidir, D01. Manter visão diária e recuperar os indicadores ou documentar exceção expressa. |
| Agenda: `/dashboard/agenda`, `/m/agenda` → `/v2/agenda` | Mesmas APIs de agenda; V2 mantém componente desktop e adapta mobile, incluindo mês e navegação para conteúdos V2. | Preservar V2. Comparar gerar, criar, editar, cancelar, repor, limpar, horários, anexos, status e efeitos financeiros. Problemas herdados em H01. |
| Lista de alunos: `/dashboard/alunos` → `/v2/alunos` | Busca/status e ações reutilizados. V2 remove a `key` de remontagem da tabela, cujo estado nasce das props. | Base preservada com risco R01: confirmar troca de filtros/status por navegação cliente sem lista antiga. |
| Cadastro/edição de aluno | V2 organiza formulário em cinco etapas, mantém campos e usa foto persistente. `noValidate` desliga a validação nativa; a função de envio não substitui todas as verificações de campos obrigatórios/tipos. | Preservar etapas; corrigir A06. Validar todas as etapas antes da requisição e abrir a etapa do erro. |
| Exclusão de aluno | Ação continua na lista. No formulário V2, o bloco Beta que contém o botão de excluir fica oculto. | Mudança de caminho, D03; não classificar como perda total da exclusão. Decidir se restaura atalho no cadastro. |
| Ficha de aluno | V2 não apresenta observações, vencimentos, fallback da agenda antiga ou acesso à impressão existentes na Beta. | Recuperar Beta, A02–A04, preservando layout V2. |
| Fotos dos alunos | V2 acrescenta Blob, validação de arquivo e limpeza de upload em erro. Relatório anterior reproduziu falha de imagem externa. | Preservar armazenamento e corrigir exibição (F01). Testar upload, ficha, edição e falha de storage. |
| Escolas/unidades | Mesmos dados-base; V2 permite editar dados das unidades junto com a escola. | Preservar V2. Tratar erro ao criar escola/primeira unidade como H04, não remover a melhoria. |
| Disciplinas | Beta permite ao professor vincular/desvincular suas disciplinas. V2 transforma tela em cadastro e move vínculo para Tabelas, restrita a administrador. | Conciliar/decidir D02: preservar organização e explicitar se professor deve continuar gerenciando os próprios vínculos. |
| Disponibilidade dos professores | V2 tem rota em Tabelas e proteção de faixas ocupadas, inclusive aulas sem horário. | Preservar V2. Testar gravação válida, conflito, cancelamento e rascunhos incompletos (F02). A ausência da antiga rota dashboard não é ausência do recurso. |
| Métodos/tipos de avaliação | Rotas próprias da V2 reutilizam componentes de cadastro. | Base preservada; homologar CRUD, vínculos existentes e autorização. |
| Calendário: `/dashboard/calendario` → `/v2/calendario` | V2 reutiliza a página, mas troca validação por `DateInput`; handlers não mantêm bloqueio Beta antes do envio. | Recuperar garantia Beta, A05. Mensagem no campo não basta para impedir clique em botão de envio. |
| Avaliações/notas | V2 possui `/v2/avaliacoes` e `/v2/notas`, ambas usam `NotasClient`; acrescenta limites de nota e feedback. Link “Ir para o Calendário” aponta para `/v2/avaliacoes`, não para o calendário. | Preservar feedback e corrigir A07; decidir papel das duas telas sem remover recurso. API de notas tem risco herdado H03. |
| Conteúdos: desktop/mobile → `/v2/conteudos` | Consultas-base preservadas; busca por tópico/aluno e navegação V2 adicionadas. Componente mobile antigo não foi integralmente substituído por equivalente nativo. | Preservar busca. Homologar anexos, voz, planejamento, ligação com aula realizada e retorno à agenda no celular. |
| Biblioteca: desktop/mobile → `/v2/biblioteca` | Consulta e funções-base reutilizadas com apresentação V2. Falha DELETE 500 foi reproduzida na auditoria anterior. | Preservar V2; H04. Testar filtros, vários arquivos, união, upload/download e erros. |
| Financeiro: `/dashboard/pagamentos` → `/v2/pagamentos` | Mesmo motor; V2 amplia histórico por aluno para todos os meses e mantém visão mensal geral. | Preservar histórico V2. Homologar totais, baixa, estorno, exclusão, recibos e filtros; riscos compartilhados H02. |
| Alertas de prova e empresas | Beta tem `prazoAlertaProvaDias` (padrão 7, intervalo 1–365), migração, formulário/API de empresas e uso no processamento. V2 não tem esse conjunto e busca 30 dias fixos. | Recuperar Beta A01, incluindo consulta mobile `/api/provas-proximas`, WhatsApp e e-mail. |
| Histórico de notificações | Escola/unidade e busca estão nas duas versões. V2 conserva nova apresentação e acesso ao histórico de e-mails. | Base preservada. Não reaplicar cegamente commit equivalente. |
| Plataforma/usuários | Área compartilhada; V2 mantém edição de disponibilidade também na plataforma e a Beta a moveu para Tabelas. | Conciliar D04: conferir todos os caminhos de escrita contra as proteções da V2. |
| Android/iOS | V2 configura appId/nome/URL de desenvolvimento distintos. Rotas `/m` continuam presentes; usá-las não equivale a testar `/v2`. | Preservar instalação separada em dev. Homologação nativa e endereço final pendentes, R03. |
| Segurança/dados | Biblioteca tenant/permissões compartilhada; V2 fortalece API de disciplinas. Auditoria registra falhas de acesso nas páginas e de referências no aluno. | Preservar proteção V2; tratar H05. Mesmo comportamento vulnerável não é aceite suficiente para substituição. |

## Ajustes de paridade para a etapa 2

| ID | Prioridade | Entrega proposta | Critério de aceitação |
|---|---|---|---|
| A01 | P1 | Trazer prazo de alerta por empresa completo. | Empresas com 7 e 15 dias retornam/processam somente provas na respectiva janela; alteração persiste; valores fora de 1–365 são recusados; empresas antigas mantêm valor configurado. Testar com serviços de envio simulados. |
| A02 | P2 | Exibir observações e vencimentos na ficha V2. | Mesmos dados Beta para MENSAL, QUINZENAL, SEMANAL e POR_AULA; vazios exibidos coerentemente; sem alterar cobrança. |
| A03 | P2 | Exibir agenda legada na ficha. | Sem `agendaSemanal`, usar `diaSemana`/`horaAula` existentes; agenda nova tem precedência e não duplica horários. |
| A04 | P2 | Disponibilizar impressão da ficha na V2. | Acesso pela ficha; dados equivalentes à impressão Beta; sem menus na impressão e sem ampliar permissões. |
| A05 | P1 | Impedir envio de data inválida no calendário. | Criar/editar com data vazia, incompleta ou fora de 2020–2100 não envia requisição; data válida salva; mensagem visível. Preservar `DateInput`. |
| A06 | P1 | Repor validações do cadastro com etapas. | Campos obrigatórios, e-mail e datas inválidos impedem envio mesmo em aba oculta; usuário chega ao campo do erro; dados digitados permanecem. |
| A07 | P2 | Corrigir destino do atalho para calendário nas notas. | Estado sem avaliações leva ao cadastro no calendário V2, sem ciclo entre duas telas de notas. |

Arquivos principais: A01 — `prisma/schema.prisma`, migração do prazo, APIs/plataforma de empresas, `src/lib/notificacoes.ts`, `src/app/api/provas-proximas/route.ts`; A02–A04 — `src/app/v2/alunos/[id]/page.tsx` e impressão; A05 — `src/components/CalendarioClient.tsx` e `DateInput`; A06 — `src/components/AlunoForm.tsx`; A07 — `src/components/NotasClient.tsx`.

## Diferenças de produto que exigem conciliação

Não tratar como autorização para remover ou recriar funcionalidades. As recomendações abaixo compõem o planejamento, ainda sem implementação.

| ID | Diferença comprovada | Recomendação |
|---|---|---|
| D01 | Home V2 substitui indicadores pedagógicos por resumo do dia. | Manter resumo diário e acrescentar notas baixas/próximas provas em espaço compacto; contador de escolas pode ficar em Escolas se essa mudança de localização for aceita. Critério de notas baixas Beta: abaixo de 50% da nota máxima, alunos contados sem duplicação. |
| D02 | Professor perde caminho V2 para gerenciar suas disciplinas; nova tela de Tabelas é admin-only. | Preservar Tabelas, oferecendo ao professor acesso apenas aos próprios vínculos; manter admin gerenciando todos. Se a restrição a admin foi deliberada, registrar exceção de paridade antes de alterar. |
| D03 | Exclusão some da edição, mas existe na listagem. | Preservar fluxo pela lista; restituir atalho só se for necessário manter a operação dentro do cadastro. |
| D04 | Disponibilidade também pode ser enviada pela plataforma na V2. | Definir caminhos oficiais e aplicar as mesmas validações/proteções em todos; não remover caminho existente sem verificar o uso. |

## Melhorias V2 a proteger em qualquer integração

1. Visual, navegação, layout compacto e adaptação ao celular.
2. Agenda mensal no mobile e navegação agenda → conteúdo → agenda dentro da V2.
3. Cadastro de aluno em etapas, mantendo todos os campos e corrigindo a validação.
4. Fotos persistentes com validação e tratamento de falha; atualização de matérias do aluno numa operação aninhada.
5. Histórico financeiro completo por aluno, sem perder a consulta mensal geral.
6. Edição de unidades na escola e ícone da empresa.
7. Disciplinas e disponibilidade em Tabelas, preservando as proteções de vínculo e de horários ocupados.
8. Limites e feedback ao salvar notas; busca textual de conteúdos.
9. `DateInput` com mensagens e recursos de acessibilidade, integrado ao bloqueio de envio.
10. Aplicativo V2 de desenvolvimento separado da instalação de produção.

Não substituir pastas inteiras nem mesclar branches sem revisão. Mudanças da V2 também afetam componentes/APIs compartilhados com `/dashboard` dentro do deployment V2; abrir uma tela Beta nesse deployment não prova equivalência com a Beta em produção.

## Defeitos e riscos separados da paridade

O relatório histórico permanece como evidência complementar, não como prova de que todos os cenários foram retestados hoje.

| ID | Origem/evidência | Próxima etapa |
|---|---|---|
| F01 | Fotos externas: falha de hostname reproduzida anteriormente; V2 usa Blob com `next/image` sem tratamento compatível nos pontos indicados. | Etapa 3: garantir exibição na ficha/edição e verificar `next.config.ts`; preservar armazenamento. |
| F02 | V2: remover uma faixa incompleta pode falhar por causa de outro rascunho inválido na pré-validação. | Etapa 3: distinguir rascunho local de alteração persistida; manter bloqueio de faixa ocupada. |
| H01 | Compartilhado: gerador de agenda idêntico; auditoria criou aula fora da disponibilidade e em feriado. | Definir regra e corrigir em trabalho identificado para ambas; não atribuir exclusivamente à migração V2. |
| H02 | Compartilhado: motor financeiro idêntico e rotas de alteração preservadas; auditoria aponta contrato por mês, datas/valores inválidos, baixa alternativa e vencimentos. | Etapa 3: reproduzir e separar defeito de regra comercial; impedir regressão ao conservar histórico V2. |
| H03 | Compartilhado: API de notas idêntica; validação da tela V2 não protege chamadas diretas. | Etapa 3: validar limites e referências no servidor. |
| H04 | Compartilhado no fluxo-base: biblioteca ignora erro ao excluir e escola falha ao criar primeira unidade. | Etapa 3: preservar estado e mostrar erro HTTP/rede; não fingir sucesso. |
| H05 | Páginas Beta e V2 conferem empresa sem a mesma restrição da API por professor; referências de aluno precisam auditoria de tenant. | P1, etapa 3: matriz de autorização e validação de relacionamentos. Não testar sobre registros reais de terceiros. |
| H06 | Auditoria prévia: pausa de e-mail, fallback sem telefone, DDD 55 e seleção por fuso nos lembretes de aula. | Reproduzir e conferir origem por função antes de classificar cada correção; não enviar mensagens reais. |
| R01 | V2 remove `key` da tabela de alunos; componente conserva estado inicial. | Teste de navegação cliente entre status/buscas; hipótese fundamentada no código, ainda não reproduzida nesta etapa. |
| R02 | Período bimestral com duas opções, status “A vencer” no dia seguinte e fotos/permissões precisam testes específicos. | Usar relatório histórico; verificar regra esperada e origem antes de mudar comportamento. |
| R03 | App V2 aponta para alias de desenvolvimento diferente do endereço de preview usado no histórico. | Confirmar destino real e capacidades nativas na homologação; não trocar configuração de produção nesta etapa. |

## Aceite futuro por perfil e ambiente

| Perfil | Verificação mínima |
|---|---|
| Administrador | Cadastros, todos os professores, financeiro, notificações, ícone e Tabelas dentro da empresa. |
| Administrador/professor | Mesmas permissões de administração e comportamento correto quando atua como professor. |
| Professor | Próprios alunos, agenda, conteúdos e notas; vínculos conforme decisão D02; sem acesso indevido a outro professor/empresa. |
| Auxiliar | Aplicar a política já definida no projeto; conferir UI e APIs, sem inferir privilégios pelo menu. |
| Plataforma | Empresas, prazo dos alertas e usuários; sem mistura de dados entre empresas. |

Em desktop e celular: buscar/listar, criar, editar, cancelar, excluir quando permitido, recarregar e confirmar persistência. Cobrir dados vazios, legados, falha de rede, HTTP 4xx/5xx, sessão expirada e acesso negado. Para agenda/financeiro, reconciliar resultados sobre o mesmo conjunto fictício; para notificações, interceptar o envio.

## Sequência recomendada após esta etapa

1. Resolver as decisões D01–D04 e manter uma lista explícita de exceções aceitas.
2. Etapa 2: A01; A02–A04; A05–A07, em blocos pequenos, preservando melhorias V2.
3. Etapa 3: priorizar permissões, dados e persistência; tratar defeitos compartilhados em escopo identificado.
4. Etapa 4: homologação autenticada com banco de testes, perfis, desktop/mobile e aplicativos; verificar aliases, variáveis, schema e cron sem expor segredos.
5. Apresentar evidências e commits exatos antes de qualquer promoção. Esta etapa 1 não autoriza execução das seguintes.

## Estado de conclusão

Etapa 1 concluída como levantamento de código e plano de paridade. Há 7 ajustes diretos, 4 decisões de conciliação e um registro separado de defeitos/riscos. A homologação integral continua pendente. Antes de implementar, atualizar novamente as referências; se os commits mudarem, revisar a matriz.

# Etapa 2 — implementação de paridade consolidada

Data: 21/09/2026.

A numeração segue docs/planejamento/paridade-beta-v2-etapa-1.md. Os ajustes previstos para a etapa 2 foram antecipados na execução solicitada após o levantamento da etapa 1. Não há necessidade de reaplicar esses ajustes.

## Entregas existentes em dev

- A01: prazo de alerta por empresa, incluindo consultas e processamento de notificações.
- A02: observações e vencimentos na ficha do aluno.
- A03: horários legados quando não há agenda semanal nova.
- A04: impressão da ficha com restrições de acesso.
- A05: bloqueio de datas inválidas no calendário.
- A06: validação do cadastro em etapas, com retorno ao campo inválido.
- A07: atalho das notas direcionado ao calendário.
- D01–D04: indicadores pedagógicos, disciplinas do professor, exclusão no formulário e proteção compartilhada da disponibilidade.

Implementação: 8ebd797. Ajustes posteriores de altura da visão geral: aba4e41 e 960c430. A ancestralidade da implementação no HEAD 960c430 foi conferida nesta consolidação.

## Evidências e alcance

O relatório docs/validacao/paridade-beta-v2-implementacao.md registra TypeScript, build, 21 testes existentes, 7 testes de paridade e testes locais no navegador aprovados. São evidências da implementação anterior, não novos testes executados nesta consolidação. Resultados de navegador permanecem em work/paridade/browser-results.json.

Preview republicado sem cache: G9BiQwcAWas2XBFtWe3FDcejfUtS, commit 960c430, estado Ready.
URL: https://edugestao-bj4p-dz8w9rksi-edugestao-s-projects.vercel.app/v2
Endereço dev: https://edugestao-bj4p-git-dev-edugestao-s-projects.vercel.app/v2

Foi necessário atribuir explicitamente o alias dev ao Preview acima. Após a atribuição, ambos os endereços retornaram HTTP 200 no login e o mesmo CSS 0h.ff~xw5wia5.css. O usuário confirmou visualmente o ajuste do painel, com quatro encontros e três atalhos completos.

## Estado e próximas etapas

Etapa 2 implementada e publicada em dev. Isso não equivale à homologação integral dos sete fluxos: persistência real, perfis, integrações e aplicativos continuam pendentes conforme etapa 4. Nenhum envio real de notificações ou alteração de dados foi realizado por esta consolidação.

Etapa 3 permanece separada: auditoria e correção dos itens F01/F02 e H01–H06, priorizando permissões, integridade dos dados e persistência. Sua execução não está incluída nesta consolidação. Produção não foi alterada.

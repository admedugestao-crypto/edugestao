# Ajustes de paridade V2 — 21/09/2026

Base V2: d2f6b7e. Integração em dev com c4f35f2 (Beta/dev). Produção af8b61d não foi alterada.

## Implementado

- A01: prazo de alertas por empresa, schema/migração já existentes em dev, APIs, plataforma, provas próximas, processamento WhatsApp/e-mail.
- A02/A03: observações, vencimentos mensal/quinzenal/semanal e agenda legada na ficha V2.
- A04: rota de impressão da ficha reutilizando o conteúdo Beta, com navegação V2 escondida na impressão e restrição por empresa/professor. Ficha e edição V2 também usam a restrição de acesso já adotada pela API.
- A05: bloqueio explícito de datas inválidas e fora de 2020–2100 antes de criar/editar avaliação, mantendo DateInput.
- A06: validação de todos os campos do formulário em etapas, retorno/foco na etapa inválida e preservação do preenchimento.
- A07: atalho das notas aponta ao calendário V2.
- D01: indicadores pedagógicos, escolas e provas recuperados sem remover o resumo diário V2.
- D02: professor gerencia os próprios vínculos em Tabelas; administrador continua gerenciando todos; proteções de disciplina vinculada preservadas.
- D03: exclusão disponível também no formulário V2, com confirmação existente.
- D04: criação pela plataforma valida faixas; alterações na plataforma e em Tabelas usam a mesma proteção contra redução/remoção de faixa ocupada. Validação acontece antes de editar o usuário.
- R01: chave da lista de alunos restaurada para atualização em troca de filtro/status.
- Exibição de foto externa na ficha V2 preparada com unoptimized; auditoria completa de fotos permanece na etapa 3.

## Validação local

- Prisma Client gerado localmente; TypeScript sem erros.
- Build Next.js --webpack concluído; aviso preexistente sobre middleware/proxy.
- 21 testes existentes de datas, disponibilidade, configuração e segurança: aprovados.
- 7 testes novos (node --test tests/paridade-v2.test.cjs): aprovados; executam APIs/componentes com banco e envios simulados.
- Navegador Edge headless: cadastro vazio na última etapa volta/foca nome sem API; preenchimento é preservado; próximo obrigatório é focado; calendário bloqueia data fora da faixa e preserva modal após erro HTTP da data válida.
- Lint dos arquivos alterados: ocorrências preexistentes; mesma contagem por regra/arquivo comparada com HEAD V2. Não há aprovação global de lint; evidência em work/paridade/lint-comparison.json.
- Scripts de navegador: tests/paridade-browser-build.cjs e tests/paridade-browser.cjs. Evidências locais: work/paridade/browser-results.json e calendario.png. O teste usa React/componentes reais com estilos mínimos e HTTP interceptado; não é homologação visual integral.

## Limites

Não foram usados dados reais nem enviados WhatsApp/e-mail. Fluxos completos autenticados, integrações reais e aplicativos Android/iOS permanecem na homologação. Defeitos compartilhados de cobrança/feriados/integrações e demais itens da etapa 3 não foram incluídos. Não há autorização para promover à produção.

A alteração do prazo já existe na branch dev e em produção: não criar outra migração com o mesmo campo. Conferir o schema do ambiente antes de aplicar migrations; nenhum comando de migração foi executado contra banco real nesta execução.

## Publicação pendente

Implementação registrada no commit 8ebd797, branch local dev. O push para https://github.com/admedugestao-crypto/edugestao.git, branch dev, foi rejeitado pela revisão automática de aprovação, que exigiu autorização explícita do usuário para o destino e publicação do código. Nenhum push foi executado.

O envio proposto incorpora a base V2 e seus ajustes na branch remota dev (75 arquivos em relação ao dev anterior), mantendo os arquivos operacionais já existentes em dev. Não altera master nem a branch remota codex/v2-financeiro-preview. O build de Preview e a verificação do ambiente publicado ficam pendentes dessa autorização.

Vercel CLI não possuía credenciais; o fluxo de login iniciado por whoami foi cancelado. A publicação planejada usa a integração Git/Vercel existente. A validação remota autenticada poderá exigir acesso ao Preview.

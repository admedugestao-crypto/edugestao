# Parametrização Geral — e-mail da plataforma

Data: 02/11/2026. Implementação em dev, sem promoção para produção.

- Menu: /plataforma/parametrizacao-geral.
- API protegida por sessão PLATAFORMA; alterações exigem origem da aplicação.
- Tabela global parametrizacao_plataforma, registro geral. Não pertence a uma empresa.
- Senha SMTP cifrada com AES-256-GCM, chave derivada de NEXTAUTH_SECRET. A senha e o valor cifrado nunca são retornados pela API. Ao trocar NEXTAUTH_SECRET, reconfigure a senha SMTP.
- Porta 465 usa TLS direto; demais portas exigem STARTTLS.
- O teste SMTP apenas verifica conexão/autenticação e não envia mensagens.
- Salvar não envia e-mails. Nenhum envio automático para inscritos foi incluído.
- Serviço enviarEmailResponsaveisEmpresa disponível para comunicações autorizadas. Destinatários: usuários SUPERADMIN ativos de uma empresa ativa, com mensagens individuais. As contas SMTP das empresas continuam independentes. Fluxos globais já existentes permanecem usando suas configurações anteriores.

## Evidências

TypeScript, ESLint e três testes de criptografia/validação aprovados.
Migração 20261102120000_parametrizacao_plataforma aplicada somente no banco dev, com projeto fixo qsxnxvcwimupyenmigzd e recusa de outros destinos.
Preview com integração: https://edugestao-bj4p-5dab3o5cw-edugestao-s-projects.vercel.app — Ready.
Log: VALIDAÇÃO OK: acesso da plataforma, bloqueio de empresa e origem externa, persistência, senha cifrada e omitida, preservação e substituição de senha. Nenhum e-mail enviado.
O registro sintético foi removido ao concluir a validação. Nenhuma credencial real foi cadastrada.
A preparação temporária de build foi removida após aplicar e validar. O script manual não roda no build normal.

## Para produção

Promover apenas b99cadb e cf105e5, após aprovação explícita. Aplicar a migração com prisma migrate deploy no banco correto antes de usar a tela. Não promover o hook temporário de dev. Preencher SMTP na nova tela e testar a conexão após publicar. Validação com um provedor real depende das credenciais que a equipe cadastrar.

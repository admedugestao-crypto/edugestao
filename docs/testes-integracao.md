# Testes de integração isolados

O ambiente em `docker-compose.integration.yml` não usa o banco DEV, contas de e-mail reais nem provedores reais de WhatsApp.

Ele inicia:

- PostgreSQL exclusivo para o schema e os dados de teste;
- Mailpit, que recebe e-mails em memória e os expõe em `http://localhost:8025`;
- MockServer, que simula a Evolution API;
- um servidor HTTP de arquivos descartáveis em memória, com envio e leitura;
- um contêiner de testes que prepara o schema e executa `tests/integration`.

A suíte recusa URLs fora dos hosts descartáveis do Compose. Os cenários incluem geração de cobrança a partir de aula realizada, deduplicação de cobrança e tentativa de acesso usando outra empresa. A comunicação SMTP é capturada pelo Mailpit, sem encaminhamento externo.

Após o Docker Desktop estar em execução, rode:

```powershell
docker compose -f docker-compose.integration.yml up --build --abort-on-container-exit --exit-code-from testes
```

Para remover os dados isolados ao terminar:

```powershell
docker compose -f docker-compose.integration.yml down --volumes
```

O cenário de arquivos valida o simulador HTTP. Ainda não substitui o SDK Vercel Blob nas rotas do aplicativo; portanto, não comprova o fluxo completo de upload dessas rotas. A suíte atual também testa serviços de domínio diretamente, sem navegação de navegador ou autenticação HTTP.

## Resultado de 14/10/2026

Cinco testes passaram, sem falhas, em 2,925 segundos de execução da suíte (fora montagem da imagem e preparação do schema):

- cobrança por aula realizada, repetição sem duplicidade e tentativa com empresa incorreta;
- conexão ao PostgreSQL descartável;
- envio do serviço real de e-mail para captura SMTP no Mailpit;
- envio do serviço real de WhatsApp para a Evolution simulada;
- envio e leitura de arquivo no simulador HTTP.

O teste adicional `prisma migrate deploy` em banco vazio falhou com P3018/42P01 na migração `20260816120000_empresa_fonnte_alerta_enviado`: a tabela `empresas` ainda não existe nesse ponto do histórico. Portanto, a preparação da suíte usa `prisma db push` somente no banco descartável, após validar seu endereço. Isso não resolve nem valida o histórico de migrações.

Para reproduzir a verificação do histórico, use um banco descartável vazio e substitua o comando do serviço:

```powershell
docker compose -f docker-compose.integration.yml run --rm testes npx prisma migrate deploy
```

Nenhuma conexão ou credencial de DEV/produção é copiada para a imagem. A rede de execução é interna e o `.dockerignore` exclui os arquivos `.env`.

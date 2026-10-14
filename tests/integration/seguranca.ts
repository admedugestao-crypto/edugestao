// Esta suíte só pode alcançar serviços descartáveis da rede Docker.
const banco = new URL(process.env.DATABASE_URL ?? "http://ausente");
if (banco.hostname !== "postgres" || banco.pathname !== "/edugestao_integracao") {
  throw new Error("Integração bloqueada: use exclusivamente o PostgreSQL descartável do Docker.");
}

for (const [variavel, host] of [
  ["INTEGRATION_MAILPIT_URL", "mailpit"],
  ["INTEGRATION_MOCKSERVER_URL", "mockserver"],
  ["INTEGRATION_ARQUIVOS_URL", "arquivos"],
]) {
  if (new URL(process.env[variavel] ?? "http://ausente").hostname !== host) {
    throw new Error(`Integração bloqueada: ${variavel} deve apontar para ${host}.`);
  }
}

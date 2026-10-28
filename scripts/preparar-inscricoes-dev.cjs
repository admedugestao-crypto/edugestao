// Execução manual no build de preview. Nunca roda no build normal ou em produção.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
const dns = require("node:dns");

(async () => {
  if (process.env.VERCEL_ENV !== "preview" || process.env.EG_V2_APLICAR_MIGRACAO_DEV !== "1") {
    throw new Error("Este preparo exige um preview com autorização explícita para o banco dev.");
  }
  const conexao = process.env.DATABASE_URL;
  const alvo = new URL(conexao);
  if (!alvo.username.includes("qsxnxvcwimupyenmigzd") || !alvo.hostname.endsWith(".pooler.supabase.com")) {
    throw new Error("Destino recusado: a conexão não corresponde ao banco de desenvolvimento esperado.");
  }
  const client = new Client({ connectionString: conexao, connectionTimeoutMillis: 10000, lookup: (host, options, cb) => dns.lookup(host, { family: 4 }, cb) });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
    if (rows.some((r) => !r.finished_at && !r.rolled_back_at)) throw new Error("O banco tem uma migração incompleta. Nenhuma mudança foi aplicada.");
    const aplicadas = new Set(rows.filter((r) => r.finished_at).map((r) => r.migration_name));
    const pendentes = fs.readdirSync(path.join(process.cwd(), "prisma/migrations-v2"), { withFileTypes: true }).filter((d) => d.isDirectory() && !aplicadas.has(d.name)).map((d) => d.name);
    if (pendentes.some((p) => p !== "20261028120000_inscricoes_teste")) throw new Error(`Migrações fora do escopo: ${pendentes.join(", ")}`);
    console.log("Destino dev conferido. Migrações no escopo:", pendentes.join(", ") || "nenhuma");
  } finally { await client.end(); }
  const resultado = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "inherit", env: { ...process.env, DIRECT_URL: conexao } });
  if (resultado.status !== 0) throw new Error("Não foi possível aplicar a migração dev.");
})().catch(() => { console.error("Preparo de inscrições interrompido: banco dev inesperado, conexão indisponível ou migrações fora do escopo. Produção não foi alterada."); process.exitCode = 1; });

// Execução manual no build de preview. Nunca roda no build normal ou em produção.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import dns from "node:dns";
import { validateAndNormalizeDatabaseUrl } from "../src/lib/databaseConfig.ts";

(async () => {
  if (process.env.VERCEL_ENV !== "preview" || process.env.EG_V2_APLICAR_MIGRACAO_DEV !== "1") {
    throw new Error("Este preparo exige um preview com autorização explícita para o banco dev.");
  }
  const conexao = validateAndNormalizeDatabaseUrl(process.env.DATABASE_URL ?? "", process.env);
  console.log("Configuração do preview:", { ambiente: process.env.VERCEL_ENV, branch: process.env.VERCEL_GIT_COMMIT_REF, conexaoDefinida: Boolean(conexao) });
  const alvo = new URL(conexao);
  console.log("Referência do destino:", alvo.username, alvo.hostname);
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
  const migracao = new URL(conexao);
  migracao.port = "5432";
  const resultado = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: conexao, DIRECT_URL: migracao.toString() } });
  if (resultado.status !== 0) throw new Error("Não foi possível aplicar a migração dev.");
})().catch((erro) => { console.error("Preparo de inscrições interrompido:", erro.message); process.exitCode = 1; });

// Execução pontual autorizada para a tabela de parametrização da plataforma.
import assert from "node:assert/strict";
import fs from "node:fs";
import dns from "node:dns";
import { spawn, spawnSync } from "node:child_process";
import { Client } from "pg";
import { encode } from "next-auth/jwt";
import { validateAndNormalizeDatabaseUrl } from "../src/lib/databaseConfig.ts";

if (process.env.VERCEL_ENV !== "production" || process.env.VERCEL_GIT_COMMIT_REF !== "master") throw new Error("Execução restrita à publicação autorizada de produção/master.");
const conexao = validateAndNormalizeDatabaseUrl(process.env.DATABASE_URL ?? "", process.env);
const alvo = new URL(conexao);
assert.equal(alvo.username, "postgres.kwabqdrmcomnlrjvipiy", "Banco de produção inesperado.");
const banco = new Client({ connectionString: conexao, connectionTimeoutMillis: 10000, lookup: (host, options, cb) => dns.lookup(host, { family: 4 }, cb) });
await banco.connect();
try {
  if (process.argv[2] === "migrar") {
    const { rows } = await banco.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
    assert.ok(!rows.some((r) => !r.finished_at && !r.rolled_back_at), "Existe migração incompleta.");
    const aplicadas = new Set(rows.filter((r) => r.finished_at).map((r) => r.migration_name));
    const pendentes = fs.readdirSync("prisma/migrations-v2", { withFileTypes: true }).filter((d) => d.isDirectory() && !aplicadas.has(d.name)).map((d) => d.name);
    assert.ok(pendentes.every((n) => n === "20261102120000_parametrizacao_plataforma"), "Migração fora do escopo aprovado.");
    console.log("Destino de produção confirmado. Migração autorizada:", pendentes.join(", ") || "já aplicada");
    alvo.port = "5432";
    const config = ".vercel/prisma-parametrizacao.config.ts";
    fs.mkdirSync(".vercel", { recursive: true });
    fs.writeFileSync(config, 'import { defineConfig } from "prisma/config"; export default defineConfig({schema:"../prisma/schema.prisma",migrations:{path:"../prisma/migrations-v2"},datasource:{url:process.env.DATABASE_URL}});');
    try {
      const resultado = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", config], { stdio: "inherit", env: { ...process.env, DATABASE_URL: alvo.toString() } });
      assert.equal(resultado.status, 0, "Migração não foi concluída.");
    } finally { fs.unlinkSync(config); }
  } else if (process.argv[2] === "validar") {
    const base = "http://localhost:3039";
    const servidor = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "3039"], { stdio: "inherit", env: process.env });
    try {
      let pronto = false;
      for (let i = 0; i < 60; i++) {
        try { if ((await fetch(`${base}/inscricao`)).ok) { pronto = true; break; } } catch { /* Aguarda servidor. */ }
        await new Promise((r) => setTimeout(r, 500));
      }
      assert.ok(pronto, "Servidor não iniciou.");
      const endpoint = `${base}/api/plataforma/parametrizacao-geral`;
      const semSessao = await fetch(endpoint, { redirect: "manual" });
      assert.ok([307, 403].includes(semSessao.status));
      const token = await encode({ secret: process.env.NEXTAUTH_SECRET, maxAge: 120, token: { id: "validacao-parametrizacao-producao", perfil: "PLATAFORMA", name: "Validação técnica" } });
      const headers = { Cookie: `edugestao.plataforma-token=${token}` };
      const resposta = await fetch(endpoint, { headers, redirect: "manual" });
      assert.equal(resposta.status, 200);
      const dados = await resposta.json();
      assert.ok(!JSON.stringify(dados).includes("emailSenhaCifrada"));
      assert.ok(!JSON.stringify(dados).includes("emailPass"));
      const tela = await fetch(`${base}/plataforma/parametrizacao-geral`, { headers });
      assert.equal(tela.status, 200);
      assert.ok((await tela.text()).includes("Parametrização Geral"));
      await banco.query('SELECT id FROM "parametrizacao_plataforma" LIMIT 1');
      console.log("VALIDAÇÃO PRODUÇÃO OK: tabela acessível, consulta autorizada, tela disponível e acesso anônimo bloqueado. Nenhuma configuração gravada e nenhum e-mail enviado.");
    } finally { servidor.kill(); }
  } else throw new Error("Ação inválida.");
} finally { await banco.end(); }

// Ferramenta manual: nunca participa de builds ou de requisições da aplicação.
import assert from "node:assert/strict";
import fs from "node:fs";
import dns from "node:dns";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { Client } from "pg";
import { encode } from "next-auth/jwt";
import { validateAndNormalizeDatabaseUrl } from "../src/lib/databaseConfig.ts";

process.chdir(path.resolve(import.meta.dirname, ".."));
const acao = process.argv[2];
if (!["migrar", "validar"].includes(acao)) throw new Error("Informe migrar ou validar.");
// Destino fixo de desenvolvimento. Uma conexão de produção sempre é recusada.
if (process.env.VERCEL && (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "dev")) throw new Error("Execução permitida somente no preview de dev.");
const ambiente = { ...process.env, VERCEL_ENV: "preview" };
const conexao = validateAndNormalizeDatabaseUrl(process.env.DATABASE_URL ?? "", ambiente);
const alvo = new URL(conexao);
if (alvo.username !== "postgres.qsxnxvcwimupyenmigzd" || !alvo.hostname.endsWith(".pooler.supabase.com")) throw new Error("Banco recusado: permitido somente dev.");
const banco = new Client({ connectionString: conexao, connectionTimeoutMillis: 10000, lookup: (host, options, cb) => dns.lookup(host, { family: 4 }, cb) });
await banco.connect();
try {
  if (acao === "migrar") {
    const { rows } = await banco.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
    assert.ok(!rows.some((r) => !r.finished_at && !r.rolled_back_at), "Existe migração incompleta.");
    const aplicadas = new Set(rows.filter((r) => r.finished_at).map((r) => r.migration_name));
    const pendentes = fs.readdirSync("prisma/migrations-v2", { withFileTypes: true }).filter((d) => d.isDirectory() && !aplicadas.has(d.name)).map((d) => d.name);
    assert.ok(pendentes.every((n) => n === "20261102120000_parametrizacao_plataforma"), "Existe migração fora do escopo.");
    console.log("Banco dev confirmado. Migração no escopo:", pendentes.join(", ") || "já aplicada");
    alvo.port = "5432";
    fs.mkdirSync(".vercel", { recursive: true });
    const config = ".vercel/prisma-parametrizacao.config.ts";
    fs.writeFileSync(config, 'import { defineConfig } from "prisma/config"; export default defineConfig({schema:"../prisma/schema.prisma",migrations:{path:"../prisma/migrations-v2"},datasource:{url:process.env.DATABASE_URL}});');
    try {
      const resultado = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", config], { stdio: "inherit", env: { ...ambiente, DATABASE_URL: alvo.toString() } });
      assert.equal(resultado.status, 0, "Não foi possível aplicar a migração dev.");
    } finally { fs.unlinkSync(config); }
  } else {
    const anterior = (await banco.query('SELECT * FROM "parametrizacao_plataforma" WHERE id=$1', ["geral"])).rows[0];
    assert.ok(!anterior, "Já existe configuração real no dev. Validação destrutiva recusada.");
    const base = "http://localhost:3038";
    const servidor = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.env.VERCEL ? "start" : "dev", "--port", "3038"], { stdio: "inherit", env: { ...ambiente, DATABASE_URL: conexao } });
    let iniciou = false;
    let criou = false;
    try {
      for (let i = 0; i < 90; i++) {
        try { if ((await fetch(`${base}/inscricao`)).ok) { iniciou = true; break; } } catch { /* Aguarda o servidor. */ }
        await new Promise((r) => setTimeout(r, 1000));
      }
      assert.ok(iniciou, "Servidor não iniciou.");
      const token = await encode({ secret: process.env.NEXTAUTH_SECRET, maxAge: 300, token: { id: "validacao-parametrizacao", perfil: "PLATAFORMA", name: "Validação técnica" } });
      const empresaToken = await encode({ secret: process.env.NEXTAUTH_SECRET, maxAge: 300, token: { id: "validacao-empresa", perfil: "SUPERADMIN", empresaId: "empresa-sintetica" } });
      const headers = { Cookie: `edugestao.plataforma-token=${token}`, Origin: base, "Content-Type": "application/json" };
      const endpoint = `${base}/api/plataforma/parametrizacao-geral`;
      const dados = { emailHost: "smtp.example.invalid", emailPort: 587, emailUser: "plataforma@example.invalid", emailPass: "senha-sintetica-nao-real", emailFrom: "" };
      for (const method of ["GET", "PUT", "POST"]) {
        const r = await fetch(endpoint, { method, redirect: "manual", headers: { Origin: base, "Content-Type": "application/json" }, ...(method === "PUT" ? { body: JSON.stringify(dados) } : {}) });
        assert.ok([307, 403].includes(r.status), `${method} sem sessão não foi bloqueado.`);
      }
      const outraEmpresa = await fetch(endpoint, { headers: { Cookie: `edugestao.plataforma-token=${empresaToken}` }, redirect: "manual" });
      assert.ok([307, 403].includes(outraEmpresa.status));
      assert.equal((await fetch(endpoint, { method: "PUT", headers: { ...headers, Origin: "https://outra-origem.invalid" }, body: JSON.stringify(dados) })).status, 403);
      assert.equal((await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify({ ...dados, emailPort: -1 }) })).status, 400);
      assert.equal((await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify({ ...dados, emailPass: "" }) })).status, 400);
      const salvar = await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify(dados) });
      assert.equal(salvar.status, 200, await salvar.text()); criou = true;
      const registro = (await banco.query('SELECT * FROM "parametrizacao_plataforma" WHERE id=$1', ["geral"])).rows[0];
      assert.ok(registro.emailSenhaCifrada.startsWith("v1:"));
      assert.ok(!registro.emailSenhaCifrada.includes(dados.emailPass));
      const consultar = await fetch(endpoint, { headers });
      const json = await consultar.json();
      assert.equal(consultar.status, 200);
      assert.equal(json.senhaConfigurada, true);
      assert.ok(!JSON.stringify(json).includes(dados.emailPass));
      assert.ok(!JSON.stringify(json).includes("emailSenhaCifrada"));
      assert.equal((await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify({ ...dados, emailPass: "", emailPort: 465 }) })).status, 200);
      const mantida = (await banco.query('SELECT "emailSenhaCifrada" FROM "parametrizacao_plataforma" WHERE id=$1', ["geral"])).rows[0];
      assert.equal(mantida.emailSenhaCifrada, registro.emailSenhaCifrada);
      assert.equal((await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify({ ...dados, emailPass: "outra-senha-sintetica" }) })).status, 200);
      const trocada = (await banco.query('SELECT "emailSenhaCifrada" FROM "parametrizacao_plataforma" WHERE id=$1', ["geral"])).rows[0];
      assert.notEqual(trocada.emailSenhaCifrada, registro.emailSenhaCifrada);
      const tela = await fetch(`${base}/plataforma/parametrizacao-geral`, { headers });
      assert.equal(tela.status, 200);
      assert.ok((await tela.text()).includes("Parametrização Geral"));
      console.log("VALIDAÇÃO OK: acesso da plataforma, bloqueio de empresa e origem externa, persistência, senha cifrada e omitida, preservação e substituição de senha. Nenhum e-mail enviado.");
    } finally {
      if (criou) await banco.query('DELETE FROM "parametrizacao_plataforma" WHERE id=$1 AND "emailHost"=$2', ["geral", "smtp.example.invalid"]);
      servidor.kill();
    }
  }
} finally { await banco.end(); }

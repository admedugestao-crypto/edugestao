// Validação pontual autorizada. Não participa do build normal do projeto.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import dns from "node:dns";
import { Client } from "pg";
import { encode } from "next-auth/jwt";
import { validateAndNormalizeDatabaseUrl } from "../src/lib/databaseConfig.ts";

if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "dev" || process.env.EG_V2_VALIDAR_INSCRICOES_DEV !== "1") {
  throw new Error("Validação permitida somente na publicação Git de Preview/dev.");
}
const conexao = validateAndNormalizeDatabaseUrl(process.env.DATABASE_URL ?? "", process.env);
if (new URL(conexao).username !== "postgres.qsxnxvcwimupyenmigzd") throw new Error("Banco dev inesperado.");
const banco = new Client({ connectionString: conexao, connectionTimeoutMillis: 10000, lookup: (host, options, cb) => dns.lookup(host, { family: 4 }, cb) });
const base = "http://localhost:3031";
const sufixo = randomUUID();
const dados = {
  nome: `Validação EG V2 ${sufixo}`, email: `${sufixo}@example.invalid`,
  whatsapp: `319${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
  materias: "Validação técnica", quantidadeAlunos: 0, organizacao: "Dados sintéticos de teste",
  dificuldade: "Validar cadastro, consulta e atualização", disponibilidade: false, consentimento: true, site: "",
};
const headers = { "Content-Type": "application/json", "x-vercel-forwarded-for": `192.0.2.${Math.floor(Math.random() * 254) + 1}` };
const post = (body) => fetch(`${base}/api/inscricao-teste`, { method: "POST", headers, body: JSON.stringify(body), redirect: "manual" });
const servidor = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "3031"], { stdio: "inherit", env: process.env });
let conectado = false;
try {
  await banco.connect(); conectado = true;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/inscricao-teste`)).ok) break; } catch { /* Aguarda o servidor local do build. */ }
    if (i === 59) throw new Error("Servidor de validação não iniciou.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.equal((await post({ ...dados, consentimento: false })).status, 400);
  const resposta = await post(dados);
  assert.equal(resposta.status, 201, `Cadastro respondeu ${resposta.status}: ${await resposta.text()}`);
  const inscricao = (await banco.query('SELECT * FROM "inscricoes_teste" WHERE "email"=$1', [dados.email])).rows[0];
  assert.ok(inscricao?.id, "Inscrição não persistiu.");
  assert.ok(inscricao.consentimentoEm);
  assert.equal(inscricao.disponibilidade, false);
  assert.equal((await post(dados)).status, 201);
  assert.equal(Number((await banco.query('SELECT count(*) AS total FROM "inscricoes_teste" WHERE "email"=$1', [dados.email])).rows[0].total), 1);
  const semSessao = await fetch(`${base}/api/plataforma/inscricoes-teste`, { redirect: "manual" });
  assert.ok([307, 403].includes(semSessao.status));
  // Sessão sintética de curta duração, restrita ao servidor local deste build.
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET, maxAge: 120, token: { id: `validacao-${sufixo}`, perfil: "PLATAFORMA", name: "Validação técnica" } });
  const cookie = { Cookie: `edugestao.plataforma-token=${token}` };
  const lista = await fetch(`${base}/api/plataforma/inscricoes-teste`, { headers: cookie, redirect: "manual" });
  assert.equal(lista.status, 200);
  assert.ok((await lista.json()).inscricoes.some((i) => i.id === inscricao.id));
  const marcar = await fetch(`${base}/api/plataforma/inscricoes-teste`, { method: "PATCH", headers: { ...cookie, "Content-Type": "application/json" }, body: JSON.stringify({ id: inscricao.id, contatado: true }) });
  assert.equal(marcar.status, 200);
  assert.ok((await banco.query('SELECT "contatadoEm" FROM "inscricoes_teste" WHERE id=$1', [inscricao.id])).rows[0].contatadoEm);
  console.log("VALIDAÇÃO EG V2 OK: cadastro persistido, consentimento registrado, duplicação impedida, lista privada protegida, consulta autenticada e contato marcado. Nenhum e-mail ou WhatsApp enviado.");
} finally {
  try {
    if (conectado) {
      // Limpeza restrita ao nome e e-mail únicos gerados nesta execução.
      await banco.query('DELETE FROM "inscricoes_teste" WHERE "email"=$1 AND "nome"=$2', [dados.email, dados.nome]);
      assert.equal(Number((await banco.query('SELECT count(*) AS total FROM "inscricoes_teste" WHERE "email"=$1', [dados.email])).rows[0].total), 0);
      console.log("Limpeza da inscrição sintética concluída.");
    }
  } finally { await banco.end(); servidor.kill(); }
}

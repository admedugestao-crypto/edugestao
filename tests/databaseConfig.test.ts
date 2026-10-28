import assert from "node:assert/strict";
import test from "node:test";
import {
  getDatabaseRuntimeConfig,
  validateAndNormalizeDatabaseUrl,
} from "../src/lib/databaseConfig.ts";

const production = { VERCEL_ENV: "production" };
const valid =
  "postgresql://postgres.projeto:senha@aws-1-us-west-2.pooler.supabase.com:6543/postgres";

test("preview usa pooler explícito preservando senha codificada e parâmetros", () => {
  const conexao = "postgresql://postgres:senha%40especial%3A%23@db.projeto.supabase.co:5432/postgres?sslmode=require";
  const normalizada = new URL(validateAndNormalizeDatabaseUrl(conexao, { VERCEL_ENV: "preview", DATABASE_POOLER_HOST: "aws-1-us-west-2.pooler.supabase.com" }));
  assert.equal(normalizada.hostname, "aws-1-us-west-2.pooler.supabase.com");
  assert.equal(normalizada.username, "postgres.projeto");
  assert.equal(normalizada.port, "6543");
  assert.equal(normalizada.password, "senha%40especial%3A%23");
  assert.equal(normalizada.searchParams.get("sslmode"), "require");
});

test("conversão é opcional, limitada ao preview e recusa servidor inválido", () => {
  const conexao = "postgresql://postgres:senha@db.projeto.supabase.co:5432/postgres";
  assert.equal(validateAndNormalizeDatabaseUrl(conexao, { VERCEL_ENV: "preview" }), conexao);
  assert.equal(validateAndNormalizeDatabaseUrl(conexao, { DATABASE_POOLER_HOST: "aws-1-us-west-2.pooler.supabase.com" }), conexao);
  assert.throws(() => validateAndNormalizeDatabaseUrl(conexao, { VERCEL_ENV: "preview", DATABASE_POOLER_HOST: "outro.example" }), /DATABASE_POOLER_HOST/);
  assert.throws(() => validateAndNormalizeDatabaseUrl(conexao, { VERCEL_ENV: "production", DATABASE_POOLER_HOST: "aws-1-us-west-2.pooler.supabase.com" }), /Pooler do Supabase/);
});

test("aceita o Pooler de transações em produção", () => {
  assert.equal(validateAndNormalizeDatabaseUrl(valid, production), valid);
});

test("remove pgbouncer sem corromper outros parâmetros", () => {
  const normalized = validateAndNormalizeDatabaseUrl(
    `${valid}?pgbouncer=true&sslmode=require`,
    production,
  );
  const parsed = new URL(normalized);
  assert.equal(parsed.pathname, "/postgres");
  assert.equal(parsed.searchParams.get("pgbouncer"), null);
  assert.equal(parsed.searchParams.get("sslmode"), "require");
});

test("recusa conexão direta do Supabase em produção", () => {
  assert.throws(
    () =>
      validateAndNormalizeDatabaseUrl(
        "postgresql://postgres:senha@db.projeto.supabase.co:5432/postgres",
        production,
      ),
    /Pooler do Supabase/,
  );
});

test("recusa porta de pool de sessão em produção", () => {
  assert.throws(
    () => validateAndNormalizeDatabaseUrl(valid.replace(":6543", ":5432"), production),
    /porta 6543/,
  );
});

test("recusa senha placeholder, colchetes e banco incorreto", () => {
  assert.throws(
    () => validateAndNormalizeDatabaseUrl(valid.replace("senha", "[SUA_SENHA]"), production),
    /placeholder|colchetes/,
  );
  assert.throws(
    () => validateAndNormalizeDatabaseUrl(`${valid}&sslmode=require`, production),
    /banco de produção/,
  );
});

test("limita o tamanho configurável do pool", () => {
  assert.equal(
    getDatabaseRuntimeConfig({
      ...production,
      DATABASE_URL: valid,
      DATABASE_POOL_MAX: "2",
    }).max,
    2,
  );
  assert.throws(
    () =>
      getDatabaseRuntimeConfig({
        ...production,
        DATABASE_URL: valid,
        DATABASE_POOL_MAX: "20",
      }),
    /entre 1 e 5/,
  );
});

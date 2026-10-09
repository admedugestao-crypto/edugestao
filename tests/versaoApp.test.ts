import assert from "node:assert/strict";
import test from "node:test";
import { obterVersaoApp } from "../src/lib/versaoApp";

test("identifica exatamente o commit do GitHub usado no deployment", () => {
  const commit = "1234567890abcdef1234567890abcdef12345678";
  const versao = obterVersaoApp({ VERCEL_GIT_COMMIT_SHA: commit });
  assert.equal(versao.commit, commit);
  assert.equal(versao.url, `https://github.com/admedugestao-crypto/edugestao/commit/${commit}`);
  assert.match(versao.numero, /^\d+\.\d+\.\d+/);
});

test("sem commit ou com referência inválida exibe apenas a versão local", () => {
  assert.equal(obterVersaoApp({}).commit, null);
  assert.equal(obterVersaoApp({ VERCEL_GIT_COMMIT_SHA: "https://externo.invalid" }).url, null);
});

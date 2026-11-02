import { test } from "node:test";
import assert from "node:assert/strict";
import { cifrarSenhaEmail, decifrarSenhaEmail, parametrizacaoEmailSchema } from "../src/lib/parametrizacaoEmail.ts";

test("senha SMTP é cifrada com nonce aleatório e só abre com a chave correta", () => {
  const senha = "senha-de-aplicativo-teste";
  const cifrada = cifrarSenhaEmail(senha, "segredo-de-teste");
  assert.ok(!cifrada.includes(senha));
  assert.notEqual(cifrada, cifrarSenhaEmail(senha, "segredo-de-teste"));
  assert.equal(decifrarSenhaEmail(cifrada, "segredo-de-teste"), senha);
  assert.throws(() => decifrarSenhaEmail(cifrada, "outro-segredo"));
  assert.throws(() => cifrarSenhaEmail(senha, ""));
});

test("credencial adulterada ou em formato inválido é rejeitada", () => {
  assert.throws(() => decifrarSenhaEmail("texto-aberto", "segredo"));
  const partes = cifrarSenhaEmail("senha", "segredo").split(":");
  partes[2] = Buffer.alloc(16).toString("base64");
  assert.throws(() => decifrarSenhaEmail(partes.join(":"), "segredo"));
});

test("valida servidor, porta e remetente e permite preservar a senha", () => {
  const base = { emailHost: "smtp.example.com", emailPort: 587, emailUser: "plataforma@example.com", emailPass: "", emailFrom: "" };
  assert.ok(parametrizacaoEmailSchema.safeParse(base).success);
  for (const campos of [{ emailPort: 0 }, { emailPort: 65536 }, { emailPort: 1.5 }, { emailFrom: "inválido" }, { emailHost: "https://smtp.example.com" }, { emailUser: "nome\r\nBcc: teste@example.com" }]) {
    assert.equal(parametrizacaoEmailSchema.safeParse({ ...base, ...campos }).success, false);
  }
});

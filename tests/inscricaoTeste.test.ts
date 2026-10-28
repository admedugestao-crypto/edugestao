import { test } from "node:test";
import assert from "node:assert/strict";
import { inscricaoTesteSchema, normalizarWhatsapp } from "../src/lib/inscricaoTeste.ts";

const valido = { nome: "Professora de Teste", email: "professora@example.com", whatsapp: "+55 (31) 99999-0000", materias: "Matemática", quantidadeAlunos: 12, organizacao: "Agenda de papel", dificuldade: "Organizar os horários", disponibilidade: true, consentimento: true, site: "" };

test("normaliza celular nacional sem perder o DDD 55", () => {
  assert.equal(normalizarWhatsapp("+55 (31) 99999-0000"), "31999990000");
  assert.equal(normalizarWhatsapp("(55) 99999-0000"), "55999990000");
});
test("rejeita celular sem DDD e e-mail inválido", () => {
  assert.equal(inscricaoTesteSchema.safeParse({ ...valido, whatsapp: "999990000" }).success, false);
  assert.equal(inscricaoTesteSchema.safeParse({ ...valido, email: "sem-email" }).success, false);
});
test("exige autorização explícita e aceita quem precisa conhecer as condições", () => {
  assert.equal(inscricaoTesteSchema.safeParse({ ...valido, consentimento: false }).success, false);
  assert.equal(inscricaoTesteSchema.safeParse({ ...valido, consentimento: "true" }).success, false);
  assert.equal(inscricaoTesteSchema.safeParse({ ...valido, disponibilidade: false }).success, true);
});
test("rejeita textos excessivos e quantidade fracionada ou negativa", () => {
  assert.equal(inscricaoTesteSchema.safeParse({ ...valido, dificuldade: "a".repeat(1001) }).success, false);
  for (const quantidadeAlunos of [-1, 1.5, "12"]) {
    assert.equal(inscricaoTesteSchema.safeParse({ ...valido, quantidadeAlunos }).success, false);
  }
});

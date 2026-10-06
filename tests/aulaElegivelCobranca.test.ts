import assert from "node:assert/strict";
import { test } from "node:test";
import { aulaElegivelParaCobrancaAutomatica } from "../src/lib/aulaElegivelCobranca.ts";

test("aula de reposição realizada não recebe cobrança automática duplicada", () => {
  assert.equal(aulaElegivelParaCobrancaAutomatica("REALIZADA", true), false);
});

test("aulas comuns realizadas e faltas de aluno continuam cobráveis", () => {
  assert.equal(aulaElegivelParaCobrancaAutomatica("REALIZADA", false), true);
  assert.equal(aulaElegivelParaCobrancaAutomatica("FALTA_ALUNO", false), true);
});

test("aula agendada continua sem cobrança", () => {
  assert.equal(aulaElegivelParaCobrancaAutomatica("AGENDADA", false), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { aulaElegivelParaCobrancaAutomatica } from "./aulaElegivelCobranca";

test("não gera cobrança automática para aula configurada sem fatura", () => {
  assert.equal(aulaElegivelParaCobrancaAutomatica("REALIZADA", false, false), false);
  assert.equal(aulaElegivelParaCobrancaAutomatica("FALTA_ALUNO", false, false), false);
});

test("mantém cobrança automática para aulas faturáveis realizadas ou com falta do aluno", () => {
  assert.equal(aulaElegivelParaCobrancaAutomatica("REALIZADA", false, true), true);
  assert.equal(aulaElegivelParaCobrancaAutomatica("FALTA_ALUNO", false, true), true);
  assert.equal(aulaElegivelParaCobrancaAutomatica("CANCELADA", false, true), false);
  assert.equal(aulaElegivelParaCobrancaAutomatica("REALIZADA", true, true), false);
});

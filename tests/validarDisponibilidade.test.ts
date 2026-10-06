import assert from "node:assert/strict";
import test from "node:test";
import { validarDisponibilidade } from "../src/lib/validarDisponibilidade.ts";

const faixa = { dia: "Segunda", inicio: "08:00", fim: "12:00" };
test("aceita horários adjacentes e horários iguais em dias distintos", () => {
  assert.equal(validarDisponibilidade([]), null);
  assert.equal(validarDisponibilidade([faixa, { ...faixa, inicio: "12:00", fim: "14:00" }]), null);
  assert.equal(validarDisponibilidade([faixa, { ...faixa, dia: "Terça" }]), null);
});
test("rejeita sobreposição, intervalos invertidos e horas incompletas", () => {
  for (const valor of [
    [faixa, { ...faixa, inicio: "11:00" }],
    [{ ...faixa, fim: "07:00" }],
    [{ ...faixa, fim: "08:00" }],
    [{ ...faixa, inicio: "8:00" }],
    [{ ...faixa, fim: "24:00" }],
    [{ ...faixa, dia: "Inexistente" }],
    [faixa, null], null, {},
  ]) assert.ok(validarDisponibilidade(valor));
});

import assert from "node:assert/strict";
import test from "node:test";
import { anoLetivoEncerrado, calcularMediaDasNotas, obterPeriodoAtual } from "../src/lib/alertasNotas";

const escolaBimestral = {
  periodoAvaliacao: "Bimestral",
  periodoLetivo1Inicio: new Date(2026, 1, 2),
  periodoLetivo1Fim: new Date(2026, 6, 10),
  periodoLetivo2Inicio: new Date(2026, 6, 27),
  periodoLetivo2Fim: new Date(2026, 11, 14),
};

test("identifica o segundo bimestre na segunda metade do primeiro período letivo", () => {
  assert.deepEqual(obterPeriodoAtual(escolaBimestral, new Date(2026, 5, 1)), {
    numero: 2,
    rotulo: "2º Bimestre",
  });
});

test("identifica o quarto bimestre na segunda metade do segundo período letivo", () => {
  assert.deepEqual(obterPeriodoAtual(escolaBimestral, new Date(2026, 10, 1)), {
    numero: 4,
    rotulo: "4º Bimestre",
  });
});

test("não define período fora das datas cadastradas", () => {
  assert.equal(obterPeriodoAtual(escolaBimestral, new Date(2026, 0, 15)), null);
});

test("só considera média anual após o fim do segundo período", () => {
  assert.equal(anoLetivoEncerrado(escolaBimestral, new Date(2026, 11, 14)), false);
  assert.equal(anoLetivoEncerrado(escolaBimestral, new Date(2026, 11, 15)), true);
  assert.equal(calcularMediaDasNotas([5, 6, 7, 4]), 5.5);
});

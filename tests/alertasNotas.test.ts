import assert from "node:assert/strict";
import test from "node:test";
import { anoLetivoEncerrado, calcularMediaDasNotas, obterPeriodoAtual, obterUltimaNotaDisponivel } from "../src/lib/alertasNotas";

const escolaBimestral = {
  periodoAvaliacao: "Bimestral",
  periodoLetivo1Inicio: new Date(2026, 1, 2),
  periodoLetivo1Fim: new Date(2026, 6, 10),
  periodoLetivo2Inicio: new Date(2026, 6, 27),
  periodoLetivo2Fim: new Date(2026, 11, 14),
};

test("mantém a nota 4,5 do terceiro bimestre enquanto o quarto está vazio", () => {
  const notas = [{ periodo: 1, valor: 5.8 }, { periodo: 2, valor: 5.7 }, { periodo: 3, valor: 4.5 }];
  assert.deepEqual(obterUltimaNotaDisponivel(escolaBimestral, new Date(2026, 9, 9), notas), {
    nota: notas[2], rotulo: "3º Bimestre",
  });
});

test("substitui a nota anterior quando o quarto bimestre é preenchido", () => {
  const notas = [{ periodo: 3, valor: 4.5 }, { periodo: 4, valor: 6.7 }];
  assert.equal(obterUltimaNotaDisponivel(escolaBimestral, new Date(2026, 10, 1), notas)?.nota.valor, 6.7);
});

test("não usa notas futuras nem recuperação como nota regular", () => {
  const notas = [{ periodo: 3, valor: 4.5 }, { periodo: 4, valor: 3 }, { periodo: 5, valor: 9 }];
  assert.equal(obterUltimaNotaDisponivel(escolaBimestral, new Date(2026, 7, 1), notas)?.nota.periodo, 3);
  assert.equal(obterUltimaNotaDisponivel(escolaBimestral, new Date(2026, 11, 15), [notas[2]]), null);
});

test("sem calendário cadastrado acompanha a última nota disponível", () => {
  const escola = { ...escolaBimestral, periodoLetivo1Inicio: null, periodoLetivo1Fim: null, periodoLetivo2Inicio: null, periodoLetivo2Fim: null };
  assert.equal(obterUltimaNotaDisponivel(escola, new Date(2026, 9, 9), [{ periodo: 3, valor: 4.5 }])?.nota.valor, 4.5);
  assert.equal(obterUltimaNotaDisponivel(escola, new Date(2026, 9, 9), []), null);
});

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

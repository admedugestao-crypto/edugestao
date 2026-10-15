import assert from "node:assert/strict";
import { test } from "node:test";
import { dataAgenda, datasRecorrencia, lerAgendaCadastro, type HorarioAgenda } from "./recorrenciaAgenda";
const data = (valor: string) => dataAgenda(valor)!;
const datas = (horario: HorarioAgenda, periodicidade: "SEMANAL" | "QUINZENAL" | "MENSAL", inicio: string, fim: string) =>
  datasRecorrencia(horario, periodicidade, data(inicio), data(fim)).map(d => d.toISOString().slice(0, 10));

test("semanal legado mantém o dia escolhido sem exigir referência", () => {
  assert.deepEqual(datas({ diaSemana: 4, horaAula: "14:00" }, "SEMANAL", "2026-10-13", "2026-10-31"), ["2026-10-15", "2026-10-22", "2026-10-29"]);
  assert.equal(lerAgendaCadastro(null, '[{"diaSemana":4,"horaAula":"14:00"}]').dados?.periodicidadeAgenda, "SEMANAL");
});

test("quinzenal usa 14 dias e mantém a fase ao gerar novamente ou retomar o contrato", () => {
  const horario = { diaSemana: 4, horaAula: "14:00", dataPrimeiraAula: "2026-10-15" };
  assert.deepEqual(datas(horario, "QUINZENAL", "2026-10-13", "2026-11-30"), ["2026-10-15", "2026-10-29", "2026-11-12", "2026-11-26"]);
  assert.deepEqual(datas(horario, "QUINZENAL", "2026-10-23", "2026-11-30"), ["2026-10-29", "2026-11-12", "2026-11-26"]);
});

test("mensal mantém dia 31 após meses menores e inclui fevereiro bissexto", () => {
  const horario = { diaSemana: 0, horaAula: "14:00", dataPrimeiraAula: "2026-01-31" };
  assert.deepEqual(datas(horario, "MENSAL", "2026-01-01", "2026-04-30"), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  assert.deepEqual(datas(horario, "MENSAL", "2028-02-01", "2028-03-31"), ["2028-02-29", "2028-03-31"]);
});

test("respeita primeira aula futura e limite do contrato sem alterar referência", () => {
  const horario = { diaSemana: 4, horaAula: "14:00", dataPrimeiraAula: "2026-10-15" };
  assert.deepEqual(datas(horario, "MENSAL", "2026-09-01", "2026-10-14"), []);
  assert.deepEqual(datas(horario, "MENSAL", "2026-11-16", "2026-12-31"), ["2026-12-15"]);
  assert.deepEqual(datas(horario, "QUINZENAL", "2026-10-16", "2026-10-28"), []);
});

test("cadastro rejeita periodicidade, datas e horários inválidos", () => {
  assert.ok(lerAgendaCadastro("DIARIA", "[]").erro);
  assert.ok(lerAgendaCadastro("MENSAL", '[{"diaSemana":1,"horaAula":"14:00"}]').erro);
  assert.ok(lerAgendaCadastro("MENSAL", '[{"diaSemana":1,"horaAula":"14:00","dataPrimeiraAula":"2026-02-30"}]').erro);
  assert.ok(lerAgendaCadastro("QUINZENAL", '[{"diaSemana":1,"horaAula":"14:00","dataPrimeiraAula":"2026-10-15"}]').erro);
  assert.ok(lerAgendaCadastro("SEMANAL", '[{"diaSemana":1,"horaAula":"99:00"}]').erro);
  assert.ok(lerAgendaCadastro("SEMANAL", "{} ").erro);
  assert.ok(lerAgendaCadastro("SEMANAL", '[{"diaSemana":1,"horaAula":"14:00","geraFatura":"sim"}]').erro);
});

test("gera fatura por padrão e preserva escolha não para cada horário", () => {
  const padrao = lerAgendaCadastro("SEMANAL", '[{"diaSemana":1,"horaAula":"14:00"}]');
  const semFatura = lerAgendaCadastro("SEMANAL", '[{"diaSemana":2,"horaAula":"15:00","geraFatura":false}]');
  assert.equal(padrao.dados?.agendaSemanal[0].geraFatura, true);
  assert.equal(semFatura.dados?.agendaSemanal[0].geraFatura, false);
});

test("mensal obtém dia da semana da referência e preserva frequência em requisição antiga", () => {
  assert.equal(lerAgendaCadastro("MENSAL", '[{"diaSemana":1,"horaAula":"14:00","dataPrimeiraAula":"2026-10-15"}]').dados?.agendaSemanal[0].diaSemana, 4);
  assert.equal(lerAgendaCadastro(null, "[]", "QUINZENAL").dados?.periodicidadeAgenda, "QUINZENAL");
});

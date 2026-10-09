import assert from "node:assert/strict";
import test from "node:test";
import { aulaPendente, coresAgenda, dataHojeAgenda, type SituacaoAgenda } from "../src/lib/pendenciasAgenda";

test("somente aulas agendadas anteriores a hoje são pendentes", () => {
  assert.equal(aulaPendente({ data: "2026-10-08T00:00:00Z", status: "AGENDADA" }, "2026-10-09"), true);
  assert.equal(aulaPendente({ data: "2026-10-09T00:00:00Z", status: "AGENDADA" }, "2026-10-09"), false);
  assert.equal(aulaPendente({ data: "2026-10-10", status: "AGENDADA" }, "2026-10-09"), false);
  for (const status of ["REALIZADA", "CANCELADA", "FALTA_ALUNO", "FALTA_PROFESSOR"] as SituacaoAgenda[]) {
    assert.equal(aulaPendente({ data: "2026-10-08", status }, "2026-10-09"), false);
  }
});

test("usa o dia de São Paulo na virada do dia UTC", () => {
  assert.equal(dataHojeAgenda(new Date("2026-10-10T02:59:00Z")), "2026-10-09");
  assert.equal(dataHojeAgenda(new Date("2026-10-10T03:00:00Z")), "2026-10-10");
});

test("pendentes são azuis, canceladas são vermelhas e agendadas de hoje são cinzas", () => {
  assert.equal(coresAgenda({ data: "2026-10-08", status: "AGENDADA" }, "2026-10-09").border, "#2563eb");
  assert.equal(coresAgenda({ data: "2026-10-08", status: "CANCELADA" }, "2026-10-09").border, "#ef4444");
  assert.equal(coresAgenda({ data: "2026-10-09", status: "AGENDADA" }, "2026-10-09").border, "#94a3b8");
});

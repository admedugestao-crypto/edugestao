import assert from "node:assert/strict";
import test from "node:test";
import { dataExiste } from "../src/lib/validarData.ts";

test("aceita datas existentes e anos bissextos gregorianos", () => {
  for (const data of ["2026-09-10", "2024-02-29", "2000-02-29", "2026-04-30", "0099-01-01"]) {
    assert.equal(dataExiste(data), true, data);
  }
});

test("rejeita datas impossíveis, incompletas e anos com mais de quatro dígitos", () => {
  for (const data of ["", "2026-02-29", "1900-02-29", "2026-04-31", "2026-13-01", "2026-01-00", "0000-01-01", "202-01-01", "20266-01-01", "2026-02", "10/09/2026", "2026-9-1"]) {
    assert.equal(dataExiste(data), false, data);
  }
});

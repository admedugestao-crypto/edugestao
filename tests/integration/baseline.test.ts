import "./seguranca";
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { prisma } from "@/lib/prisma";

after(async () => { await prisma.$disconnect(); });

test("migrações preservam restrições CHECK e índices parciais", async () => {
  const restricoes = await prisma.$queryRaw<{ conname: string; convalidated: boolean }[]>`
    SELECT conname, convalidated FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace AND conname IN (
      'empresas_prazoAlertaProvaDias_check',
      'notas_periodo_valor_check', 'notas_periodo_periodo_check'
    )`;
  assert.equal(restricoes.length, 3);
  assert.ok(restricoes.every((item) => item.convalidated));
  const indices = await prisma.$queryRaw<{ nome: string; valido: boolean }[]>`
    SELECT c.relname AS nome, i.indisvalid AS valido
    FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relnamespace = 'public'::regnamespace AND i.indpred IS NOT NULL
      AND c.relname IN ('agenda_aulas_empresa_agendadas_data_idx', 'pagamentos_empresa_abertos_idx')`;
  assert.equal(indices.length, 2);
  assert.ok(indices.every((item) => item.valido));
});

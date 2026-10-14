import "./seguranca";
import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { gerarPagamentoAula } from "@/lib/motorCobranca";

after(async () => { await prisma.$disconnect(); });

test("aula realizada gera uma cobrança, preserva deduplicação e isola empresas", async () => {
  const empresa = await prisma.empresa.create({
    data: { nome: "Empresa fictícia integração", slug: `integracao-${randomUUID()}` },
  });
  const outraEmpresa = await prisma.empresa.create({
    data: { nome: "Outra empresa integração", slug: `integracao-${randomUUID()}` },
  });
  const usuario = await prisma.usuario.create({
    data: {
      empresaId: empresa.id, nome: "Professora fictícia",
      email: "professora@integration.invalid", senhaHash: "sem-login",
      perfil: "PROFESSORA", professora: { create: { empresaId: empresa.id } },
    },
    include: { professora: true },
  });
  const escola = await prisma.escola.create({ data: { empresaId: empresa.id, nome: "Escola fictícia" } });
  const unidade = await prisma.unidade.create({
    data: { empresaId: empresa.id, escolaId: escola.id, nome: "Unidade fictícia" },
  });
  const aluno = await prisma.aluno.create({
    data: {
      empresaId: empresa.id, unidadeId: unidade.id, professoraId: usuario.professora!.id,
      nome: "Aluno fictício", serie: "3º ano", tipoCobranca: "POR_AULA", valorCobranca: 80,
      dataInicioContrato: new Date("2026-01-01T00:00:00Z"),
      dataFimContrato: new Date("2026-12-31T00:00:00Z"),
    },
  });
  const aula = await prisma.agendaAula.create({
    data: {
      empresaId: empresa.id, alunoId: aluno.id, professoraId: usuario.professora!.id,
      data: new Date("2026-10-14T00:00:00Z"), status: "REALIZADA",
    },
  });

  assert.deepEqual(await gerarPagamentoAula(outraEmpresa.id, aula.id), { semCobranca: true });
  assert.equal(await prisma.pagamento.count({ where: { alunoId: aluno.id } }), 0);

  await gerarPagamentoAula(empresa.id, aula.id);
  await gerarPagamentoAula(empresa.id, aula.id);
  const pagamentos = await prisma.pagamento.findMany({ where: { alunoId: aluno.id } });
  assert.equal(pagamentos.length, 1);
  assert.equal(Number(pagamentos[0].valorCobrado), 80);
  assert.equal(pagamentos[0].tipoCobrancaGerada, "POR_AULA");
  assert.equal(await prisma.pagamentoAula.count({ where: { agendaAulaId: aula.id } }), 1);

  // Os registros são descartáveis: o comando de encerramento remove o volume inteiro.
});

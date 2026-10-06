import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const alunoId = searchParams.get("alunoId");

  const where: any = { empresaId: scope.empresaId };
  if (!scope.isAdmin) where.aluno = { professoraId: scope.professoraId ?? "__sem_professora__" };
  if (alunoId) where.alunoId = alunoId;

  const notas = await prisma.nota.findMany({
    where,
    include: {
      aluno: { select: { nome: true } },
      avaliacao: true,
      materia: true,
    },
    orderBy: { avaliacao: { data: "desc" } },
  });

  return NextResponse.json(notas);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  if (![body.alunoId, body.avaliacaoId, body.materiaId].every(id => typeof id === "string" && id.length > 0) || typeof body.valor !== "number" || !Number.isFinite(body.valor) || body.valor < 0)
    return NextResponse.json({ erro: "Informe referências e uma nota válida." }, { status: 400 });

  const [alunoOk, avaliacaoOk, materiaOk] = await Promise.all([
    prisma.aluno.findFirst({
      where: {
        id: body.alunoId,
        empresaId: scope.empresaId,
        ...(!scope.isAdmin ? { professoraId: scope.professoraId ?? "__sem_professora__" } : {}),
      },
      select: { id: true, unidadeId: true, serie: true, materias: { select: { materiaId: true } } },
    }),
    prisma.avaliacao.findFirst({ where: { id: body.avaliacaoId, empresaId: scope.empresaId }, select: { id: true, unidadeId: true, serie: true, materiaId: true, notaMax: true } }),
    prisma.materia.findFirst({ where: { id: body.materiaId, empresaId: scope.empresaId }, select: { id: true } }),
  ]);
  if (!alunoOk || !avaliacaoOk || !materiaOk) {
    return NextResponse.json({ erro: "Aluno, avaliação ou matéria não encontrados." }, { status: 404 });
  }

  if (body.valor > avaliacaoOk.notaMax || alunoOk.unidadeId !== avaliacaoOk.unidadeId || alunoOk.serie !== avaliacaoOk.serie || (avaliacaoOk.materiaId && avaliacaoOk.materiaId !== body.materiaId) || !alunoOk.materias.some(m => m.materiaId === body.materiaId))
    return NextResponse.json({ erro: "Nota fora do limite ou avaliação incompatível com o aluno e a disciplina." }, { status: 400 });

  const nota = await prisma.nota.upsert({
    where: {
      alunoId_avaliacaoId_materiaId: {
        alunoId: body.alunoId,
        avaliacaoId: body.avaliacaoId,
        materiaId: body.materiaId,
      },
    },
    update: { valor: body.valor, observacao: body.observacao || null },
    create: {
      empresaId: scope.empresaId,
      alunoId: body.alunoId,
      avaliacaoId: body.avaliacaoId,
      materiaId: body.materiaId,
      valor: body.valor,
      observacao: body.observacao || null,
    },
    include: { aluno: { select: { nome: true } }, materia: true, avaliacao: true },
  });

  return NextResponse.json(nota, { status: 201 });
}

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
  if (!scope.isAdmin && scope.professoraId) where.aluno = { professoraId: scope.professoraId };
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

  const [alunoOk, avaliacaoOk, materiaOk] = await Promise.all([
    prisma.aluno.findFirst({ where: { id: body.alunoId, empresaId: scope.empresaId }, select: { id: true } }),
    prisma.avaliacao.findFirst({ where: { id: body.avaliacaoId, empresaId: scope.empresaId }, select: { id: true } }),
    prisma.materia.findFirst({ where: { id: body.materiaId, empresaId: scope.empresaId }, select: { id: true } }),
  ]);
  if (!alunoOk || !avaliacaoOk || !materiaOk) {
    return NextResponse.json({ erro: "Aluno, avaliação ou matéria não encontrados." }, { status: 404 });
  }

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

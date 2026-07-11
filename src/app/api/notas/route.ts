import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const professoraId = (session.user as any).professoraId as string | null;
  const { searchParams } = new URL(req.url);
  const alunoId = searchParams.get("alunoId");

  const notas = await prisma.nota.findMany({
    where: {
      aluno: professoraId ? { professoraId } : {},
      ...(alunoId ? { alunoId } : {}),
    },
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
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
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

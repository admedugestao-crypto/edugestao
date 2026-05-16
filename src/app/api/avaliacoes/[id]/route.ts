import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const avaliacao = await prisma.avaliacao.update({
    where: { id },
    data: {
      unidadeId: body.unidadeId,
      materiaId: body.materiaId || null,
      serie: body.serie,
      nome: body.nome,
      data: new Date(body.data),
      notaMax: body.notaMax ?? 10.0,
      periodo: body.periodo || null,
    },
    include: { unidade: { include: { escola: true } }, materia: true },
  });
  return NextResponse.json(avaliacao);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const notas = await prisma.nota.count({ where: { avaliacaoId: id } });
  if (notas > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a avaliação possui notas lançadas." },
      { status: 409 }
    );
  }

  await prisma.avaliacao.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

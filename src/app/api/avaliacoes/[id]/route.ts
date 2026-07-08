import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existente = await prisma.avaliacao.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Avaliação não encontrada." }, { status: 404 });
  }

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
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.avaliacao.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Avaliação não encontrada." }, { status: 404 });
  }

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

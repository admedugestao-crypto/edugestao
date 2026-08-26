import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const dataStr = String(body.data ?? "");
  const anoData = Number(dataStr.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr) || anoData < 2000 || anoData > 2100) {
    return NextResponse.json({ erro: "Data inválida." }, { status: 400 });
  }

  const [existente, unidadeOk, materiaOk] = await Promise.all([
    prisma.avaliacao.findUnique({ where: { id }, select: { empresaId: true } }),
    prisma.unidade.findFirst({
      where: { id: body.unidadeId, empresaId: scope.empresaId },
      select: { id: true },
    }),
    body.materiaId
      ? prisma.materia.findFirst({
          where: { id: body.materiaId, empresaId: scope.empresaId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Avaliação não encontrada." }, { status: 404 });
  }
  if (!unidadeOk) return NextResponse.json({ erro: "Unidade não encontrada." }, { status: 404 });
  if (body.materiaId && !materiaOk) {
    return NextResponse.json({ erro: "Matéria não encontrada." }, { status: 404 });
  }

  const avaliacao = await prisma.avaliacao.update({
    where: { id },
    data: {
      unidadeId: body.unidadeId,
      materiaId: body.materiaId || null,
      serie: body.serie,
      nome: body.nome,
      data: new Date(dataStr),
      notaMax: body.notaMax ?? 10.0,
      periodo: body.periodo || null,
      observacao: body.observacao || null,
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

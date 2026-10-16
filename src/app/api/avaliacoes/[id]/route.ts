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

  const materiaIds = Array.isArray(body.materiaIds)
    ? [...new Set(body.materiaIds.filter((id: unknown) => typeof id === "string" && id.length > 0))]
    : typeof body.materiaId === "string" && body.materiaId ? [body.materiaId] : [];
  if (materiaIds.length === 0) {
    return NextResponse.json({ erro: "Selecione ao menos uma disciplina." }, { status: 400 });
  }

  const [existente, unidadeOk, materiasOk] = await Promise.all([
    prisma.avaliacao.findUnique({ where: { id }, select: { empresaId: true } }),
    prisma.unidade.findFirst({
      where: { id: body.unidadeId, empresaId: scope.empresaId },
      select: { id: true },
    }),
    prisma.materia.findMany({ where: { id: { in: materiaIds }, empresaId: scope.empresaId }, select: { id: true } }),
  ]);
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Avaliação não encontrada." }, { status: 404 });
  }
  if (!unidadeOk) return NextResponse.json({ erro: "Unidade não encontrada." }, { status: 404 });
  if (materiasOk.length !== materiaIds.length) {
    return NextResponse.json({ erro: "Uma ou mais disciplinas não foram encontradas." }, { status: 404 });
  }

  const avaliacao = await prisma.avaliacao.update({
    where: { id },
    data: {
      unidadeId: body.unidadeId,
      materiaId: materiaIds[0],
      materias: { deleteMany: {}, create: materiaIds.map((materiaId) => ({ materiaId })) },
      serie: body.serie,
      nome: body.nome,
      data: new Date(dataStr),
      notaMax: body.notaMax ?? 10.0,
      periodo: body.periodo || null,
      observacao: body.observacao || null,
    },
    include: { unidade: { include: { escola: true } }, materia: true, materias: { include: { materia: true } } },
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

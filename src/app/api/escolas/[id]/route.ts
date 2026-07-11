import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existente = await prisma.escola.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Escola não encontrada." }, { status: 404 });
  }

  const escola = await prisma.escola.update({
    where: { id },
    data: { nome: body.nome, rede: body.rede || null, periodoAvaliacao: body.periodoAvaliacao || null },
    include: { unidades: { orderBy: { nome: "asc" } } },
  });
  return NextResponse.json(escola);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.escola.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Escola não encontrada." }, { status: 404 });
  }

  const [unidades, alunos, avaliacoes] = await Promise.all([
    prisma.unidade.count({ where: { escolaId: id } }),
    prisma.aluno.count({ where: { unidade: { escolaId: id } } }),
    prisma.avaliacao.count({ where: { unidade: { escolaId: id } } }),
  ]);

  if (alunos > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a escola possui alunos vinculados." },
      { status: 409 }
    );
  }
  if (avaliacoes > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a escola possui avaliações vinculadas." },
      { status: 409 }
    );
  }
  if (unidades > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a escola possui unidades cadastradas." },
      { status: 409 }
    );
  }

  await prisma.escola.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

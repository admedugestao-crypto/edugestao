import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (!body.nome || !body.nome.trim()) {
    return NextResponse.json({ erro: "Nome é obrigatório." }, { status: 400 });
  }

  const existente = await prisma.tipoAvaliacao.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Tipo não encontrado." }, { status: 404 });
  }

  try {
    const tipo = await prisma.tipoAvaliacao.update({
      where: { id },
      data: { nome: body.nome.trim() },
    });
    return NextResponse.json(tipo);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ erro: "Já existe um tipo com esse nome." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.tipoAvaliacao.findUnique({ where: { id }, select: { empresaId: true, nome: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Tipo não encontrado." }, { status: 404 });
  }

  // Não há FK direta com Avaliacao (o nome é copiado como texto na criação),
  // então o vínculo é checado por correspondência de nome dentro da mesma
  // empresa — se alguma avaliação já usa esse tipo, bloqueia a exclusão.
  const avaliacoesVinculadas = await prisma.avaliacao.count({
    where: { empresaId: scope.empresaId, nome: existente.nome },
  });
  if (avaliacoesVinculadas > 0) {
    return NextResponse.json(
      { erro: `Não é possível excluir: existem ${avaliacoesVinculadas} avaliação(ões) cadastrada(s) com esse tipo.` },
      { status: 409 },
    );
  }

  await prisma.tipoAvaliacao.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

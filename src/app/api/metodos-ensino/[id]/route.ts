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

  const existente = await prisma.metodoEnsino.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Método não encontrado." }, { status: 404 });
  }

  try {
    const metodo = await prisma.metodoEnsino.update({
      where: { id },
      data: { nome: body.nome.trim() },
    });
    return NextResponse.json(metodo);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ erro: "Já existe um método com esse nome." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.metodoEnsino.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Método não encontrado." }, { status: 404 });
  }

  const [materiaisVinculados, escolasVinculadas] = await Promise.all([
    prisma.materialBiblioteca.count({ where: { metodoId: id } }),
    prisma.escola.count({ where: { metodoId: id } }),
  ]);

  if (materiaisVinculados > 0 && escolasVinculadas > 0) {
    return NextResponse.json(
      {
        erro: `Não é possível excluir: o método está vinculado a ${materiaisVinculados} material(is) da Biblioteca e ${escolasVinculadas} escola(s).`,
      },
      { status: 409 }
    );
  }
  if (materiaisVinculados > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: o método está vinculado a materiais da Biblioteca." },
      { status: 409 }
    );
  }
  if (escolasVinculadas > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: o método está vinculado a uma ou mais escolas." },
      { status: 409 }
    );
  }

  await prisma.metodoEnsino.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

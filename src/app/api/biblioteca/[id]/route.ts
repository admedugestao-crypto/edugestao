import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existente = await prisma.materialBiblioteca.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Material não encontrado." }, { status: 404 });
  }

  const material = await prisma.materialBiblioteca.update({
    where: { id },
    data: {
      titulo: body.titulo,
      descricao: body.descricao || null,
      metodo: body.metodo || null,
      serie: body.serie || null,
      materiaId: body.materiaId || null,
      ...(body.arquivoUrl ? { arquivoUrl: body.arquivoUrl, arquivoNome: body.arquivoNome || null } : {}),
    },
    include: { materia: true },
  });
  return NextResponse.json(material);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.materialBiblioteca.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Material não encontrado." }, { status: 404 });
  }

  await prisma.materialBiblioteca.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { normalizarIds } from "@/lib/entityIds";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existente = await prisma.materialBiblioteca.findFirst({ where: { id, empresaId: scope.empresaId }, select: { id: true } });
  if (!existente) {
    return NextResponse.json({ erro: "Material não encontrado." }, { status: 404 });
  }

  const materiaIds = normalizarIds(body.materiaIds);
  if (!body.titulo || !body.descricao || !body.metodoId || !body.serie || materiaIds.length === 0) {
    return NextResponse.json(
      { erro: "Título, descrição, método, série e disciplina(s) são obrigatórios." },
      { status: 400 }
    );
  }

  const [metodo, materias] = await Promise.all([
    prisma.metodoEnsino.findFirst({ where: { id: body.metodoId, empresaId: scope.empresaId }, select: { id: true } }),
    prisma.materia.findMany({ where: { id: { in: materiaIds }, empresaId: scope.empresaId }, select: { id: true } }),
  ]);
  if (!metodo) {
    return NextResponse.json({ erro: "Método inválido." }, { status: 400 });
  }
  if (materias.length !== materiaIds.length) {
    return NextResponse.json({ erro: "Uma ou mais disciplinas são inválidas." }, { status: 400 });
  }

  const material = await prisma.$transaction(async (tx) => {
    await tx.materialBibliotecaMateria.deleteMany({ where: { materialId: id } });
    return tx.materialBiblioteca.update({
      where: { id },
      data: {
        titulo: body.titulo,
        descricao: body.descricao,
        metodoId: body.metodoId,
        serie: body.serie,
        materiaId: materiaIds[0],
        ...(body.arquivoUrl ? { arquivoUrl: body.arquivoUrl, arquivoNome: body.arquivoNome || null } : {}),
        materias: { create: materiaIds.map((materiaId) => ({ materiaId })) },
      },
      include: { materia: true, metodoEnsino: true, materias: { select: { materia: true } } },
    });
  });
  return NextResponse.json(material);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.materialBiblioteca.findFirst({ where: { id, empresaId: scope.empresaId }, select: { id: true } });
  if (!existente) {
    return NextResponse.json({ erro: "Material não encontrado." }, { status: 404 });
  }

  await prisma.materialBiblioteca.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

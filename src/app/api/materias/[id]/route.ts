import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existente = await prisma.materia.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Disciplina não encontrada." }, { status: 404 });
  }

  const materia = await prisma.materia.update({
    where: { id },
    data: { nome: body.nome, cor: body.cor },
  });
  return NextResponse.json(materia);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.materia.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Disciplina não encontrada." }, { status: 404 });
  }

  const [alunos, notas, conteudos] = await Promise.all([
    prisma.alunoMateria.count({ where: { materiaId: id } }),
    prisma.nota.count({ where: { materiaId: id } }),
    prisma.conteudo.count({ where: { materiaId: id } }),
  ]);

  if (alunos > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a disciplina está vinculada a alunos." },
      { status: 409 }
    );
  }

  if (notas > 0 || conteudos > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a disciplina possui notas ou conteúdos vinculados." },
      { status: 409 }
    );
  }

  await prisma.materia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

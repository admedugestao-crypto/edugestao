import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const materia = await prisma.materia.update({
    where: { id },
    data: { nome: body.nome, cor: body.cor },
  });
  return NextResponse.json(materia);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

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

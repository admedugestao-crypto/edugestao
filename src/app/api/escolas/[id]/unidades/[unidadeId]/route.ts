import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; unidadeId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { unidadeId } = await params;
  const body = await req.json();

  const unidade = await prisma.unidade.update({
    where: { id: unidadeId },
    data: {
      nome: body.nome,
      cidade: body.cidade || null,
      estado: body.estado || null,
      turno: body.turno || null,
    },
  });
  return NextResponse.json(unidade);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; unidadeId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { unidadeId } = await params;

  const [alunos, avaliacoes, calendarios] = await Promise.all([
    prisma.aluno.count({ where: { unidadeId } }),
    prisma.avaliacao.count({ where: { unidadeId } }),
    prisma.calendarioEscolar.count({ where: { unidadeId } }),
  ]);

  if (alunos > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a unidade possui alunos vinculados." },
      { status: 409 }
    );
  }
  if (avaliacoes > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a unidade possui avaliações vinculadas." },
      { status: 409 }
    );
  }
  if (calendarios > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a unidade possui eventos de calendário vinculados." },
      { status: 409 }
    );
  }

  await prisma.unidade.delete({ where: { id: unidadeId } });
  return NextResponse.json({ ok: true });
}

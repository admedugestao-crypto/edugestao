import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validarAgenda } from "@/lib/conteudoAgenda";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id }    = await params;
  const body      = await req.json();
  const dataAula  = new Date(body.data);
  const planejado = body.planejado ?? false;

  const existente = await prisma.conteudo.findUnique({ where: { id }, select: { aulaId: true } });
  if (!existente) return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });

  const validacao = await validarAgenda(body.alunoId, dataAula, planejado, existente.aulaId, body.materiaId || null);
  if (!validacao.ok) return NextResponse.json({ erro: validacao.erro }, { status: 422 });

  const conteudo = await prisma.conteudo.update({
    where: { id },
    data: {
      alunoId:    body.alunoId,
      materiaId:  body.materiaId || null,
      topico:     body.topico,
      descricao:  body.descricao  || null,
      arquivoUrl: body.arquivoUrl !== undefined ? body.arquivoUrl || null : undefined,
      data:       dataAula,
      planejado,
    },
    include: {
      aluno:   { select: { nome: true } },
      materia: true,
    },
  });
  return NextResponse.json(conteudo);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  // Bloqueia exclusão se houver aula com status REALIZADA vinculada a este conteúdo.
  // Só considera vínculo real (aulaId gravado) — nunca por inferência de
  // aluno+data+matéria, que pode "achar" a aula de OUTRO conteúdo do mesmo dia.
  const conteudo = await prisma.conteudo.findUnique({
    where: { id },
    select: { aulaId: true },
  });
  if (conteudo?.aulaId) {
    const aula = await prisma.agendaAula.findUnique({ where: { id: conteudo.aulaId }, select: { status: true } });
    if (aula?.status === "REALIZADA") {
      return NextResponse.json(
        { erro: "Não é possível excluir: existe uma agenda com status Realizada vinculada a este conteúdo." },
        { status: 422 },
      );
    }
  }

  await prisma.conteudo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

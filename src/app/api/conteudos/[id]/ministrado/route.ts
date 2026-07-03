import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const conteudo = await prisma.conteudo.findUnique({
    where: { id },
    select: { id: true, alunoId: true, data: true, planejado: true, materiaId: true, aulaId: true, materia: { select: { nome: true } } },
  });

  if (!conteudo) return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });
  if (!conteudo.planejado) return NextResponse.json({ erro: "Conteúdo já está Ministrado." }, { status: 422 });

  const dY = conteudo.data.getUTCFullYear();
  const dM = conteudo.data.getUTCMonth();
  const dD = conteudo.data.getUTCDate();

  const selectAula = { id: true, status: true, horaFim: true, materiaId: true, materia: { select: { nome: true } } } as const;

  // Prioriza o vínculo exato (aulaId) — só cai para busca por aluno+data
  // (ambígua quando há +1 aula no mesmo dia) para conteúdos antigos sem vínculo.
  const aula = conteudo.aulaId
    ? await prisma.agendaAula.findUnique({ where: { id: conteudo.aulaId }, select: selectAula })
    : await prisma.agendaAula.findFirst({
        where: {
          alunoId: conteudo.alunoId,
          data: {
            gte: new Date(Date.UTC(dY, dM, dD)),
            lt: new Date(Date.UTC(dY, dM, dD + 1)),
          },
        },
        select: selectAula,
      });

  if (!aula) {
    return NextResponse.json(
      { erro: "Nenhuma Aula Agendada encontrada para este aluno nesta data." },
      { status: 422 },
    );
  }

  // Valida que a matéria do conteúdo é a mesma da Aula Agendada (null = Todas as matérias, sempre compatível)
  if (aula.materiaId && conteudo.materiaId && aula.materiaId !== conteudo.materiaId) {
    return NextResponse.json(
      {
        erro: `A matéria do conteúdo (${conteudo.materia?.nome ?? conteudo.materiaId}) não corresponde à matéria da Aula Agendada (${aula.materia?.nome ?? aula.materiaId}).`,
      },
      { status: 422 },
    );
  }

  // Bloqueia se ainda não passou o horário de término da aula (fuso UTC-3 Brasil)
  if (aula.horaFim) {
    const [hh, mm] = aula.horaFim.split(":").map(Number);
    // horaFim é horário local (UTC-3), converte para UTC somando 3h
    const fimUTC = new Date(Date.UTC(dY, dM, dD, hh + 3, mm));
    if (new Date() < fimUTC) {
      return NextResponse.json(
        { erro: `Não é possível marcar como Ministrado antes do término da Aula Agendada (${aula.horaFim}).` },
        { status: 422 },
      );
    }
  } else {
    // Sem horário definido: bloqueia se a data ainda não passou
    const hojeUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1));
    if (conteudo.data >= hojeUTC) {
      return NextResponse.json(
        { erro: "Não é possível marcar como Ministrado: a Aula Agendada ainda não ocorreu." },
        { status: 422 },
      );
    }
  }

  if (aula.status === "CANCELADA") {
    return NextResponse.json(
      { erro: "Não é possível marcar como Ministrado: a Aula Agendada está Cancelada." },
      { status: 422 },
    );
  }

  if (aula.status === "FALTA_PROFESSOR") {
    return NextResponse.json(
      { erro: "Não é possível marcar como Ministrado: a Aula Agendada está registrada como Falta do Professor." },
      { status: 422 },
    );
  }

  // Marca a agenda como REALIZADA, o conteúdo como Ministrado, e grava o vínculo exato
  await prisma.$transaction([
    prisma.agendaAula.update({
      where: { id: aula.id },
      data: { status: "REALIZADA" },
    }),
    prisma.conteudo.update({
      where: { id: conteudo.id },
      data: { planejado: false, aulaId: aula.id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

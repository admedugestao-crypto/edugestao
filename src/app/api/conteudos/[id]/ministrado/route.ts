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
    select: { id: true, alunoId: true, data: true, planejado: true },
  });

  if (!conteudo) return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });
  if (!conteudo.planejado) return NextResponse.json({ erro: "Conteúdo já está Ministrado." }, { status: 422 });

  const dY = conteudo.data.getUTCFullYear();
  const dM = conteudo.data.getUTCMonth();
  const dD = conteudo.data.getUTCDate();

  const aula = await prisma.agendaAula.findFirst({
    where: {
      alunoId: conteudo.alunoId,
      data: {
        gte: new Date(Date.UTC(dY, dM, dD)),
        lt: new Date(Date.UTC(dY, dM, dD + 1)),
      },
    },
    select: { id: true, status: true },
  });

  if (!aula) {
    return NextResponse.json(
      { erro: "Nenhuma aula agendada encontrada para este aluno nesta data." },
      { status: 422 },
    );
  }

  // Bloqueia para datas futuras (mesma regra da agenda)
  const hoje = new Date();
  const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + 1));
  if (conteudo.data >= hojeUTC) {
    return NextResponse.json(
      { erro: "Não é possível marcar como Ministrado: a aula ainda não ocorreu." },
      { status: 422 },
    );
  }

  if (aula.status === "CANCELADA") {
    return NextResponse.json(
      { erro: "Não é possível marcar como Ministrado: a aula está Cancelada." },
      { status: 422 },
    );
  }

  if (aula.status === "FALTA_PROFESSOR") {
    return NextResponse.json(
      { erro: "Não é possível marcar como Ministrado: a aula está registrada como Falta do Professor." },
      { status: 422 },
    );
  }

  // Mark the agenda as REALIZADA and the conteúdo as Ministrado
  await prisma.$transaction([
    prisma.agendaAula.update({
      where: { id: aula.id },
      data: { status: "REALIZADA" },
    }),
    prisma.conteudo.update({
      where: { id: conteudo.id },
      data: { planejado: false },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

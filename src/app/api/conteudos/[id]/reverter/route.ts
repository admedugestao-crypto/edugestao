import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Reverte conteúdo Ministrado → Planejado e agenda REALIZADA → AGENDADA
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
  if (conteudo.planejado) return NextResponse.json({ erro: "Conteúdo já está Planejado." }, { status: 422 });

  const dY = conteudo.data.getUTCFullYear();
  const dM = conteudo.data.getUTCMonth();
  const dD = conteudo.data.getUTCDate();

  const aula = await prisma.agendaAula.findFirst({
    where: {
      alunoId: conteudo.alunoId,
      status: "REALIZADA",
      data: {
        gte: new Date(Date.UTC(dY, dM, dD)),
        lt: new Date(Date.UTC(dY, dM, dD + 1)),
      },
    },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.conteudo.update({ where: { id }, data: { planejado: true } });
    if (aula) {
      await tx.agendaAula.update({ where: { id: aula.id }, data: { status: "AGENDADA" } });
    }
  });

  return NextResponse.json({ ok: true });
}

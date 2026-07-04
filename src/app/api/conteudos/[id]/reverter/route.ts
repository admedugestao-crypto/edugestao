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
    select: { id: true, planejado: true, aulaId: true },
  });

  if (!conteudo) return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });
  if (conteudo.planejado) return NextResponse.json({ erro: "Conteúdo já está Planejado." }, { status: 422 });

  // Só considera vínculo real (aulaId gravado) — nunca por inferência de
  // aluno+data, que pode "achar" a aula de OUTRO conteúdo do mesmo dia.
  const aula = conteudo.aulaId
    ? await prisma.agendaAula.findUnique({ where: { id: conteudo.aulaId }, select: { id: true, status: true } })
    : null;
  const aulaRealizada = aula?.status === "REALIZADA" ? aula : null;

  await prisma.$transaction(async (tx) => {
    await tx.conteudo.update({ where: { id }, data: { planejado: true } });
    if (aulaRealizada) {
      await tx.agendaAula.update({ where: { id: aulaRealizada.id }, data: { status: "AGENDADA" } });
    }
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buscarAulaVinculada } from "@/lib/conteudoAgenda";

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
    select: { id: true, alunoId: true, data: true, planejado: true, aulaId: true, materiaId: true },
  });

  if (!conteudo) return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });
  if (conteudo.planejado) return NextResponse.json({ erro: "Conteúdo já está Planejado." }, { status: 422 });

  const aula = await buscarAulaVinculada(conteudo);
  const aulaRealizada = aula?.status === "REALIZADA" ? aula : null;

  await prisma.$transaction(async (tx) => {
    await tx.conteudo.update({ where: { id }, data: { planejado: true } });
    if (aulaRealizada) {
      await tx.agendaAula.update({ where: { id: aulaRealizada.id }, data: { status: "AGENDADA" } });
    }
  });

  return NextResponse.json({ ok: true });
}

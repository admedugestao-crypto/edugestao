import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/agenda/[id] — atualizar status, horário, observação
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const { status, horaInicio, horaFim, observacao, materiaId, data } = body;

  const aula = await prisma.agendaAula.findUnique({ where: { id } });
  if (!aula) return NextResponse.json({ erro: "Aula não encontrada" }, { status: 404 });

  const updated = await prisma.agendaAula.update({
    where: { id },
    data: {
      ...(status     !== undefined ? { status }               : {}),
      ...(horaInicio !== undefined ? { horaInicio }           : {}),
      ...(horaFim    !== undefined ? { horaFim }              : {}),
      ...(observacao !== undefined ? { observacao }           : {}),
      ...(materiaId  !== undefined ? { materiaId: materiaId || null } : {}),
      ...(data       !== undefined ? { data: new Date(data) } : {}),
    },
    include: {
      aluno:   { select: { id: true, nome: true, serie: true, turma: true } },
      materia: { select: { id: true, nome: true, cor: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/agenda/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const aula = await prisma.agendaAula.findUnique({ where: { id } });
  if (!aula) return NextResponse.json({ erro: "Aula não encontrada" }, { status: 404 });

  // Bloqueia se esta aula estiver vinculada a um registro de pagamento
  // Usa SQL raw para não depender do modelo PagamentoAula no client gerado
  const vinculos = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count FROM pagamento_aulas WHERE "agendaAulaId" = ${id}
  `;
  if (vinculos[0].count > 0n) {
    return NextResponse.json(
      { erro: "Não é possível excluir: esta aula está vinculada a um registro de pagamento gerado. Exclua o pagamento primeiro." },
      { status: 422 },
    );
  }

  await prisma.agendaAula.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

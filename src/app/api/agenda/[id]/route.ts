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

  // Bloqueia qualquer mudança de status quando a aula está REALIZADA e tem conteúdo relacionado
  if (status !== undefined && aula.status === "REALIZADA") {
    const dY = aula.data.getUTCFullYear();
    const dM = aula.data.getUTCMonth();
    const dD = aula.data.getUTCDate();
    const conteudo = await prisma.conteudo.findFirst({
      where: {
        alunoId: aula.alunoId,
        data: {
          gte: new Date(Date.UTC(dY, dM, dD)),
          lt:  new Date(Date.UTC(dY, dM, dD + 1)),
        },
      },
      select: { id: true },
    });
    if (conteudo) {
      return NextResponse.json(
        { erro: "Não é possível alterar o status: esta agenda está Realizada e possui conteúdo registrado." },
        { status: 422 },
      );
    }
  }

  // Bloqueia mudança para CANCELADA ou FALTA_PROFESSOR quando o pagamento vinculado já foi pago.
  // Se o pagamento ainda está "a vencer" (pago = false), permite a alteração.
  if (status === "CANCELADA" || status === "FALTA_PROFESSOR") {
    const vinculosPagos = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM pagamento_aulas pa
      JOIN pagamentos p ON p.id = pa."pagamentoId"
      WHERE pa."agendaAulaId" = ${id}
        AND p.pago = true
    `;
    if (Number(vinculosPagos[0].count) > 0) {
      return NextResponse.json(
        { erro: `Não é possível marcar como "${status === "CANCELADA" ? "Cancelada" : "Falta do Professor"}": esta aula está vinculada a um pagamento já quitado.` },
        { status: 422 },
      );
    }
  }

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

  // Bloqueia apenas se houver pagamento já quitado vinculado
  const vinculosPagos = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count
    FROM pagamento_aulas pa
    JOIN pagamentos p ON p.id = pa."pagamentoId"
    WHERE pa."agendaAulaId" = ${id} AND p.pago = true
  `;
  if (Number(vinculosPagos[0].count) > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: esta aula está vinculada a um pagamento já quitado." },
      { status: 422 },
    );
  }

  await prisma.agendaAula.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

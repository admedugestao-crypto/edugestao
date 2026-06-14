import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function diaUTC(data: Date) {
  const dY = data.getUTCFullYear();
  const dM = data.getUTCMonth();
  const dD = data.getUTCDate();
  return {
    gte: new Date(Date.UTC(dY, dM, dD)),
    lt:  new Date(Date.UTC(dY, dM, dD + 1)),
  };
}

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

  // Bloqueia mudar para REALIZADA sem conteúdo registrado
  if (status === "REALIZADA") {
    const conteudo = await prisma.conteudo.findFirst({
      where: { alunoId: aula.alunoId, data: diaUTC(aula.data) },
      select: { id: true },
    });
    if (!conteudo) {
      return NextResponse.json(
        { erro: "Não é possível marcar como Realizada: registre primeiro o conteúdo da aula." },
        { status: 422 },
      );
    }
  }

  // Se sair de REALIZADA para outro status → exclui o conteúdo vinculado
  if (status !== undefined && status !== "REALIZADA" && aula.status === "REALIZADA") {
    await prisma.conteudo.deleteMany({
      where: { alunoId: aula.alunoId, data: diaUTC(aula.data) },
    });
  }

  // Bloqueia mudança para CANCELADA ou FALTA_PROFESSOR quando o pagamento vinculado já foi pago.
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

  // Se a aula estava REALIZADA, exclui o conteúdo vinculado
  if (aula.status === "REALIZADA") {
    await prisma.conteudo.deleteMany({
      where: { alunoId: aula.alunoId, data: diaUTC(aula.data) },
    });
  }

  await prisma.agendaAula.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

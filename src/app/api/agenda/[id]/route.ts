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
  const { status, horaInicio, horaFim, observacao, materiaId, todasMaterias, data } = body;

  if ((horaInicio !== undefined && !horaInicio) || (horaFim !== undefined && !horaFim)) {
    return NextResponse.json({ erro: "Início e fim são obrigatórios" }, { status: 400 });
  }

  // Troca para "Todas as matérias": restaura N:N com todas as matérias do aluno
  if (todasMaterias) {
    const alulaCheck = await prisma.agendaAula.findUnique({
      where: { id },
      select: { alunoId: true, aluno: { select: { materias: { select: { materiaId: true } } } } },
    });
    if (alulaCheck) {
      const ids = alulaCheck.aluno.materias.map((m) => m.materiaId);
      await prisma.agendaAulaMateria.deleteMany({ where: { agendaAulaId: id } });
      if (ids.length > 0) {
        await prisma.agendaAulaMateria.createMany({
          data: ids.map((mid) => ({ agendaAulaId: id, materiaId: mid })),
          skipDuplicates: true,
        });
      }
      await prisma.agendaAula.update({
        where: { id },
        data: { materiaId: ids[0] ?? null },
      });
    }
  }

  // Troca para matéria específica: atualiza N:N para só essa matéria
  if (materiaId) {
    await prisma.agendaAulaMateria.deleteMany({ where: { agendaAulaId: id } });
    await prisma.agendaAulaMateria.create({ data: { agendaAulaId: id, materiaId } });
  }

  const aula = await prisma.agendaAula.findUnique({ where: { id } });
  if (!aula) return NextResponse.json({ erro: "Aula não encontrada" }, { status: 404 });

  // Bloqueia mudar para REALIZADA sem conteúdo registrado; se conteúdo for planejado, converte para ministrado
  // Busca pelo vínculo exato (aulaId) — evita pegar o conteúdo de outra aula do
  // mesmo aluno no mesmo dia, quando há mais de uma.
  if (status === "REALIZADA") {
    const conteudo = await prisma.conteudo.findUnique({
      where: { aulaId: id },
      select: { id: true, planejado: true },
    });
    if (!conteudo) {
      return NextResponse.json(
        { erro: "Não é possível marcar como Realizada: registre primeiro o conteúdo da Aula Agendada." },
        { status: 422 },
      );
    }
    if (conteudo.planejado) {
      await prisma.conteudo.update({ where: { id: conteudo.id }, data: { planejado: false } });
    }
  }

  // Se sair de REALIZADA para outro status → exclui o conteúdo vinculado
  if (status !== undefined && status !== "REALIZADA" && aula.status === "REALIZADA") {
    await prisma.conteudo.deleteMany({
      where: { aulaId: id },
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
        { erro: `Não é possível marcar como "${status === "CANCELADA" ? "Cancelada" : "Falta do Professor"}": esta Aula Agendada está vinculada a um pagamento já quitado.` },
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
      materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
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
      { erro: "Não é possível excluir: esta Aula Agendada está vinculada a um pagamento já quitado." },
      { status: 422 },
    );
  }

  // Se a aula estava REALIZADA, exclui o conteúdo vinculado
  if (aula.status === "REALIZADA") {
    await prisma.conteudo.deleteMany({
      where: { aulaId: id },
    });
  }

  await prisma.agendaAula.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

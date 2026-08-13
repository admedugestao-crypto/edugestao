import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { gerarPagamentoAula, type ParcelaGerada } from "@/lib/motorCobranca";

export const dynamic = "force-dynamic";

// PATCH /api/agenda/[id] — atualizar status, horário, observação
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const { status, horaInicio, horaFim, observacao, materiaIds, data } = body;

  const aulaEmpresa = await prisma.agendaAula.findUnique({ where: { id }, select: { empresaId: true } });
  if (!aulaEmpresa || aulaEmpresa.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Aula não encontrada" }, { status: 404 });
  }

  if ((horaInicio !== undefined && !horaInicio) || (horaFim !== undefined && !horaFim)) {
    return NextResponse.json({ erro: "Início e fim são obrigatórios" }, { status: 400 });
  }

  // Uma vez que um Conteúdo já foi vinculado a esta aula, a matéria não pode
  // mais mudar — o Conteúdo foi registrado pra essa matéria especificamente,
  // e trocar aqui deixaria os dois dessincronizados. Checagem no servidor
  // além da UI, já que a rota pode ser chamada diretamente.
  if (materiaIds !== undefined) {
    const conteudoVinculado = await prisma.conteudo.findUnique({ where: { aulaId: id }, select: { id: true } });
    if (conteudoVinculado) {
      return NextResponse.json(
        { erro: "Não é possível trocar a matéria: já existe um Conteúdo vinculado a esta aula." },
        { status: 422 },
      );
    }

    // Vazio = "todas as matérias" do aluno; não-vazio = exatamente essa lista.
    let ids: string[] = Array.isArray(materiaIds) ? materiaIds : [];
    if (ids.length === 0) {
      const alulaCheck = await prisma.agendaAula.findUnique({
        where: { id },
        select: { aluno: { select: { materias: { select: { materiaId: true } } } } },
      });
      ids = alulaCheck?.aluno.materias.map((m) => m.materiaId) ?? [];
    }
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

  // Voltar para AGENDADA → a aula deixa de ser cobrada (só REALIZADA e
  // FALTA_ALUNO geram cobrança). Pagamentos vinculados ficam com quantidade/
  // valor defasados, então são desmarcados como não pagos e excluídos — igual
  // ao Conteúdo acima. O motor de cobrança regenera o período sem esta aula.
  // FALTA_ALUNO não passa por aqui: falta do aluno continua sendo cobrada.
  if (status === "AGENDADA" && aula.status !== "AGENDADA") {
    const vinculos = await prisma.pagamentoAula.findMany({
      where: { agendaAulaId: id },
      select: { pagamentoId: true },
    });
    const pagamentoIds = [...new Set(vinculos.map((v) => v.pagamentoId))];
    if (pagamentoIds.length > 0) {
      await prisma.pagamento.updateMany({
        where: { id: { in: pagamentoIds } },
        data: { pago: false, dataPagamento: null },
      });
      await prisma.pagamento.deleteMany({ where: { id: { in: pagamentoIds } } });
    }
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
      ...(data       !== undefined ? { data: new Date(data) } : {}),
    },
    include: {
      aluno:   { select: { id: true, nome: true, serie: true, turma: true } },
      materia: { select: { id: true, nome: true, cor: true } },
      materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
    },
  });

  // Marcar como Realizada ou Falta do Aluno gera/atualiza a cobrança na hora —
  // não depende mais de rodar "Gerar cobranças" em lote depois. Uma falha aqui
  // não derruba a resposta: o status já foi salvo.
  let avisoPagamento: string | undefined;
  let pagamentoGerado: ParcelaGerada | undefined;
  if (status === "REALIZADA" || status === "FALTA_ALUNO") {
    try {
      const resultado = await gerarPagamentoAula(scope.empresaId, updated.id);
      if (!resultado.semCobranca) pagamentoGerado = resultado.parcela;
    } catch (e) {
      console.error("Falha ao gerar pagamento automático:", e);
      avisoPagamento = "Status salvo, mas não foi possível gerar a cobrança automaticamente.";
    }
  } else if (status === "CANCELADA" || status === "FALTA_PROFESSOR") {
    // A aula deixou de ser cobrável → exclui o pagamento vinculado, igual ao
    // Conteúdo. O guard acima já bloqueou essa transição se o pagamento
    // vinculado estivesse pago, então aqui é sempre um pagamento em aberto.
    const vinculos = await prisma.pagamentoAula.findMany({
      where: { agendaAulaId: id },
      select: { pagamentoId: true },
    });
    const pagamentoIds = [...new Set(vinculos.map((v) => v.pagamentoId))];
    if (pagamentoIds.length > 0) {
      await prisma.pagamento.deleteMany({ where: { id: { in: pagamentoIds } } });
    }
  }

  return NextResponse.json({
    ...updated,
    ...(pagamentoGerado ? { pagamentoGerado } : {}),
    ...(avisoPagamento ? { avisoPagamento } : {}),
  });
}

// DELETE /api/agenda/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const aula = await prisma.agendaAula.findUnique({ where: { id } });
  if (!aula || aula.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Aula não encontrada" }, { status: 404 });
  }

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

  // Exclui o(s) pagamento(s) vinculados a esta aula, igual ao Conteúdo —
  // o guard acima já bloqueou a exclusão se algum estivesse pago, então aqui
  // é sempre um pagamento em aberto. Busca os vínculos ANTES de excluir a
  // aula, porque a exclusão em cascata apaga a linha de vínculo junto.
  const vinculos = await prisma.pagamentoAula.findMany({
    where: { agendaAulaId: id },
    select: { pagamentoId: true },
  });
  const pagamentoIds = [...new Set(vinculos.map((v) => v.pagamentoId))];

  await prisma.agendaAula.delete({ where: { id } });

  if (pagamentoIds.length > 0) {
    await prisma.pagamento.deleteMany({ where: { id: { in: pagamentoIds } } });
  }

  return NextResponse.json({ ok: true });
}

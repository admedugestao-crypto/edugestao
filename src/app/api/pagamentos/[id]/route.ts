import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// PATCH /api/pagamentos/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();

  const existente = await prisma.pagamento.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Pagamento não encontrado." }, { status: 404 });
  }

  // ── Bloqueia baixa se houver aulas VINCULADAS ainda com status Agendada ──────
  // Usa a tabela PagamentoAula para verificar apenas as aulas que geraram este pagamento.
  if (body.pago === true) {
    const aulasAgendadas = await prisma.pagamentoAula.count({
      where: {
        pagamentoId: id,
        agendaAula:  { status: "AGENDADA" },
      },
    });

    if (aulasAgendadas > 0) {
      return NextResponse.json(
        {
          erro: `Não é possível baixar: ainda há ${aulasAgendadas} aula(s) vinculada(s) com status Agendada. Lance o resultado de cada aula na agenda antes de confirmar o pagamento.`,
        },
        { status: 422 },
      );
    }
  }

  // Calcula dataPagamento: campo explícito tem prioridade sobre o flag pago
  let dataPagamentoUpdate: Date | null | undefined;
  if (body.dataPagamento !== undefined) {
    dataPagamentoUpdate = body.dataPagamento ? new Date(body.dataPagamento) : null;
  } else if (body.pago === true)  {
    dataPagamentoUpdate = new Date();
  } else if (body.pago === false) {
    dataPagamentoUpdate = null;
  }

  const pagamento = await prisma.pagamento.update({
    where: { id },
    data: {
      dataVencimento:  body.dataVencimento  !== undefined ? new Date(body.dataVencimento) : undefined,
      pago:            body.pago            !== undefined ? body.pago            : undefined,
      dataPagamento:   dataPagamentoUpdate,
      observacao:      body.observacao      !== undefined ? body.observacao      : undefined,
      quantidadeAulas: body.quantidadeAulas !== undefined ? body.quantidadeAulas : undefined,
      valorCobrado:    body.valorCobrado    !== undefined ? body.valorCobrado    : undefined,
    },
  });

  return NextResponse.json(pagamento);
}

// DELETE /api/pagamentos/[id]
// Pagamentos manuais (origemManual=true) podem sempre ser excluídos.
// Pagamentos gerados automaticamente só podem ser excluídos se todas as
// aulas do mês estiverem com status CANCELADA ou FALTA_PROFESSOR.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const pagamento = await prisma.pagamento.findUnique({ where: { id } });
  if (!pagamento || pagamento.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Pagamento não encontrado." }, { status: 404 });
  }

  // Pagamentos criados manualmente pelo admin podem sempre ser excluídos
  if (!pagamento.origemManual) {
    // Intervalo UTC do mês de competência
    const inicioMes = new Date(Date.UTC(pagamento.ano, pagamento.mes - 1, 1));
    const fimMes    = new Date(Date.UTC(pagamento.ano, pagamento.mes,     1));

    const aulasDoMes = await prisma.agendaAula.findMany({
      where: {
        alunoId: pagamento.alunoId,
        data: { gte: inicioMes, lt: fimMes },
      },
      select: { status: true },
    });

    // Bloqueia se houver aula ativa (não cancelada / não falta do professor)
    const aulaAtiva = aulasDoMes.find(
      (a) => a.status !== "CANCELADA" && a.status !== "FALTA_PROFESSOR",
    );

    if (aulaAtiva) {
      return NextResponse.json(
        {
          erro: "Exclusão não permitida: existem aulas deste mês que não estão com status Cancelada ou Falta do Professor.",
          bloqueio: true,
        },
        { status: 422 },
      );
    }
  }

  await prisma.pagamento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

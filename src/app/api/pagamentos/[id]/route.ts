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

  return NextResponse.json({ ...pagamento, valorCobrado: Number(pagamento.valorCobrado) });
}

// DELETE /api/pagamentos/[id]
// Pagamentos manuais (origemManual=true, o que inclui os de reposição) podem
// sempre ser excluídos. Pagamentos gerados automaticamente (vinculados a
// aulas via PagamentoAula) só podem ser excluídos se todas as aulas
// vinculadas estiverem CANCELADA ou FALTA_PROFESSOR — normalmente isso já
// nem chega a ser necessário, porque marcar a aula como Cancelada/Falta do
// Professor (ou excluí-la) já exclui o pagamento vinculado automaticamente;
// esta checagem é a rede de segurança pra quando isso não aconteceu.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const pagamento = await prisma.pagamento.findUnique({ where: { id } });
  if (!pagamento || pagamento.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Pagamento não encontrado." }, { status: 404 });
  }

  // Pagamentos criados manualmente pelo admin (inclusive os de reposição) podem sempre ser excluídos
  if (!pagamento.origemManual) {
    const vinculos = await prisma.pagamentoAula.findMany({
      where: { pagamentoId: id },
      select: { agendaAula: { select: { status: true } } },
    });

    // Bloqueia se alguma aula vinculada ainda estiver ativa (não cancelada / não falta do professor)
    const aulaAtiva = vinculos.find(
      (v) => v.agendaAula.status !== "CANCELADA" && v.agendaAula.status !== "FALTA_PROFESSOR",
    );

    if (aulaAtiva) {
      return NextResponse.json(
        {
          erro: "Exclusão não permitida: existem aulas vinculadas a este pagamento que não estão com status Cancelada ou Falta do Professor.",
          bloqueio: true,
        },
        { status: 422 },
      );
    }
  }

  await prisma.pagamento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

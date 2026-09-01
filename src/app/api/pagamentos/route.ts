import { NextRequest, NextResponse } from "next/server";
import type { PagamentoWhereInput } from "@/generated/prisma/models/Pagamento";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { podeGerenciarFinanceiro } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET /api/pagamentos?mes=5&ano=2026
// Retorna registros reais de pagamento serializados (sem objetos Prisma brutos)
export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes         = parseInt(searchParams.get("mes")   ?? "0");
  const ano         = parseInt(searchParams.get("ano")   ?? "0");
  const alunoFiltro = searchParams.get("aluno");

  if (!alunoFiltro && (!mes || !ano)) {
    return NextResponse.json({ erro: "mes e ano obrigatórios" }, { status: 400 });
  }

  const where: PagamentoWhereInput = { empresaId: scope.empresaId };
  if (alunoFiltro) {
    where.alunoId = alunoFiltro;
  } else {
    where.mes = mes;
    where.ano = ano;
  }
  // Admin vê pagamentos de todos os professores; professora vê só os próprios alunos
  if (!scope.isAdmin && scope.professoraId) where.aluno = { professoraId: scope.professoraId };

  const pagamentos = await prisma.pagamento.findMany({
    where,
    include: {
      aluno: {
        select: {
          id:               true,
          nome:             true,
          tipoCobranca:     true,
          valorCobranca:    true,
          responsavel:      true,
          emailResponsavel: true,
          unidade:    { select: { nome: true, escola: { select: { nome: true } } } },
          professora: { select: { usuario: { select: { nome: true } } } },
        },
      },
      aulas: {
        select: {
          agendaAula: {
            select: {
              id:         true,
              data:       true,
              horaInicio: true,
              horaFim:    true,
              status:     true,
              materia:    { select: { nome: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { dataVencimento: alunoFiltro ? "desc" : "asc" },
      { aluno: { nome: "asc" } },
      { parcela: "asc" },
    ],
  });

  // Serializa para evitar objetos Prisma brutos (Dates, relações aninhadas)
  const resultado = pagamentos.map((p) => ({
    id:              p.id,
    alunoId:         p.alunoId,
    mes:             p.mes,
    ano:             p.ano,
    parcela:         p.parcela,
    dataVencimento:  p.dataVencimento.toISOString(),
    valorCobrado:    Number(p.valorCobrado),
    quantidadeAulas: p.quantidadeAulas,
    pago:            p.pago,
    dataPagamento:   p.dataPagamento?.toISOString() ?? null,
    observacao:      p.observacao ?? null,
    origemManual:    p.origemManual,
    origemReposicao: p.origemReposicao,
    emailTipo:       p.emailTipo ?? null,
    emailEnviadoEm:  p.emailEnviadoEm?.toISOString() ?? null,
    aluno: {
      id:               p.aluno.id,
      nome:             p.aluno.nome,
      tipoCobranca:     p.aluno.tipoCobranca ?? "",
      valorCobranca:    p.aluno.valorCobranca != null ? Number(p.aluno.valorCobranca) : 0,
      responsavel:      p.aluno.responsavel ?? null,
      emailResponsavel: p.aluno.emailResponsavel ?? null,
      unidade: {
        nome:   p.aluno.unidade.nome,
        escola: { nome: p.aluno.unidade.escola.nome },
      },
      professora: p.aluno.professora?.usuario?.nome ?? null,
    },
    aulasVinculadas: p.aulas.map((pa) => ({
      id:         pa.agendaAula.id,
      data:       pa.agendaAula.data.toISOString(),
      horaInicio: pa.agendaAula.horaInicio,
      horaFim:    pa.agendaAula.horaFim,
      status:     pa.agendaAula.status,
      materia:    pa.agendaAula.materia?.nome ?? null,
    })),
  }));

  return NextResponse.json(resultado);
}

// POST /api/pagamentos — criar registro avulso (compatibilidade)
export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  if (!podeGerenciarFinanceiro(scope)) return NextResponse.json({ erro: "Apenas administradores podem criar cobranças." }, { status: 403 });

  const body = await req.json();
  const { alunoId, mes, ano, parcela = 1, pago, valorCobrado, dataVencimento, quantidadeAulas, observacao } = body;

  const alunoOk = await prisma.aluno.findFirst({ where: { id: alunoId, empresaId: scope.empresaId }, select: { id: true } });
  if (!alunoOk) return NextResponse.json({ erro: "Aluno não encontrado." }, { status: 404 });

  const pagamento = await prisma.pagamento.upsert({
    where: { alunoId_mes_ano_parcela: { alunoId, mes, ano, parcela } },
    update: {
      pago,
      dataPagamento:   pago ? new Date() : null,
      quantidadeAulas: quantidadeAulas ?? undefined,
      observacao:      observacao      ?? undefined,
      valorCobrado:    valorCobrado    ?? undefined,
    },
    create: {
      empresaId: scope.empresaId,
      alunoId, mes, ano, parcela,
      dataVencimento:  new Date(dataVencimento),
      valorCobrado,
      quantidadeAulas: quantidadeAulas ?? null,
      pago,
      dataPagamento:   pago ? new Date() : null,
      observacao:      observacao ?? null,
      origemManual:    true,
    },
  });

  return NextResponse.json({ ...pagamento, valorCobrado: Number(pagamento.valorCobrado) });
}

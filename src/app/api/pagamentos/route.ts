import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/pagamentos?mes=5&ano=2026
// Retorna registros reais de pagamento serializados (sem objetos Prisma brutos)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes         = parseInt(searchParams.get("mes")   ?? "0");
  const ano         = parseInt(searchParams.get("ano")   ?? "0");
  const alunoFiltro = searchParams.get("aluno");

  if (!mes || !ano) return NextResponse.json({ erro: "mes e ano obrigatórios" }, { status: 400 });

  const professoraId = (session.user as any).professoraId as string | null;

  const where: any = { mes, ano };
  if (alunoFiltro)  where.alunoId = alunoFiltro;
  if (professoraId) where.aluno   = { ...(where.aluno ?? {}), professoraId };

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
    },
    orderBy: [
      { dataVencimento: "asc" },
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
    valorCobrado:    p.valorCobrado,
    quantidadeAulas: p.quantidadeAulas,
    pago:            p.pago,
    dataPagamento:   p.dataPagamento?.toISOString() ?? null,
    observacao:      p.observacao ?? null,
    emailTipo:       p.emailTipo ?? null,
    emailEnviadoEm:  p.emailEnviadoEm?.toISOString() ?? null,
    aluno: {
      id:               p.aluno.id,
      nome:             p.aluno.nome,
      tipoCobranca:     p.aluno.tipoCobranca ?? "",
      valorCobranca:    p.aluno.valorCobranca ?? 0,
      responsavel:      p.aluno.responsavel ?? null,
      emailResponsavel: p.aluno.emailResponsavel ?? null,
      unidade: {
        nome:   p.aluno.unidade.nome,
        escola: { nome: p.aluno.unidade.escola.nome },
      },
      professora: p.aluno.professora?.usuario?.nome ?? null,
    },
  }));

  return NextResponse.json(resultado);
}

// POST /api/pagamentos — criar registro avulso (compatibilidade)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { alunoId, mes, ano, parcela = 1, pago, valorCobrado, dataVencimento, quantidadeAulas, observacao } = body;

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
      alunoId, mes, ano, parcela,
      dataVencimento:  new Date(dataVencimento),
      valorCobrado,
      quantidadeAulas: quantidadeAulas ?? null,
      pago,
      dataPagamento:   pago ? new Date() : null,
      observacao:      observacao ?? null,
    },
  });

  return NextResponse.json(pagamento);
}

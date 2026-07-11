import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  enviarEmailAtraso,
  enviarEmailLembrete,
  enviarEmailRecibo,
  emailConfigurado,
} from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/email/pagamento
// Body: { pagamentoId, tipo: "atraso" | "lembrete" | "recibo" }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  if (!emailConfigurado()) {
    return NextResponse.json(
      { erro: "E-mail não configurado. Configure EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env.local." },
      { status: 503 },
    );
  }

  const { pagamentoId, tipo } = await req.json() as {
    pagamentoId: string;
    tipo: "atraso" | "lembrete" | "recibo";
  };

  if (!pagamentoId || !tipo)
    return NextResponse.json({ erro: "pagamentoId e tipo são obrigatórios" }, { status: 400 });

  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    include: {
      aluno: {
        include: {
          professora: { include: { usuario: { select: { nome: true } } } },
        },
      },
    },
  });

  if (!pagamento)
    return NextResponse.json({ erro: "Pagamento não encontrado" }, { status: 404 });

  const aluno = pagamento.aluno;

  if (!aluno.emailResponsavel)
    return NextResponse.json({ erro: "Responsável não possui e-mail cadastrado." }, { status: 422 });

  const nomeProfessora =
    aluno.professora?.usuario?.nome ?? (session.user as any)?.name ?? "Professor(a)";

  const base = {
    emailResponsavel: aluno.emailResponsavel,
    nomeResponsavel:  aluno.responsavel ?? aluno.emailResponsavel,
    nomeAluno:        aluno.nome,
    tipoCobranca:     aluno.tipoCobranca ?? "MENSAL",
    valorCobrado:     pagamento.valorCobrado,
    mes:              pagamento.mes,
    ano:              pagamento.ano,
    nomeProfessora,
    parcela:          pagamento.parcela > 1 ? pagamento.parcela : undefined,
  };

  let resultado: { ok: boolean; erro?: string };

  if (tipo === "atraso") {
    resultado = await enviarEmailAtraso({
      ...base,
      dataVencimento: pagamento.dataVencimento,
    });
  } else if (tipo === "lembrete") {
    resultado = await enviarEmailLembrete({
      ...base,
      dataVencimento: pagamento.dataVencimento,
    });
  } else if (tipo === "recibo") {
    if (!pagamento.dataPagamento)
      return NextResponse.json({ erro: "Pagamento ainda não foi marcado como pago." }, { status: 422 });

    resultado = await enviarEmailRecibo({
      ...base,
      dataPagamento: pagamento.dataPagamento,
    });
  } else {
    return NextResponse.json({ erro: "Tipo inválido" }, { status: 400 });
  }

  if (!resultado.ok)
    return NextResponse.json({ erro: resultado.erro }, { status: 500 });

  // Grava o tipo e hora do último e-mail enviado
  await prisma.pagamento.update({
    where: { id: pagamentoId },
    data:  { emailTipo: tipo, emailEnviadoEm: new Date() },
  });

  return NextResponse.json({ ok: true, emailTipo: tipo, emailEnviadoEm: new Date().toISOString() });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { enviarEmailAtraso, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const session = await auth();

  if (!emailConfigurado()) {
    return NextResponse.json(
      { erro: "E-mail não configurado no servidor. Configure as variáveis EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env.local." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { alunoId, mes, ano, parcela = 1 } = body;

  if (!alunoId || !mes || !ano) {
    return NextResponse.json({ erro: "alunoId, mes e ano são obrigatórios" }, { status: 400 });
  }

  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: {
      professora: { include: { usuario: { select: { nome: true } } } },
      pagamentos: { where: { mes, ano, parcela } },
    },
  });

  if (!aluno || aluno.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Aluno não encontrado" }, { status: 404 });
  }

  if (!aluno.emailResponsavel) {
    return NextResponse.json(
      { erro: "Responsável não possui e-mail cadastrado." },
      { status: 422 }
    );
  }

  const pagamento = aluno.pagamentos[0];
  const nomeProfessora =
    aluno.professora?.usuario?.nome ?? (session?.user as any)?.name ?? "Professor(a)";

  const dataVencimento = pagamento?.dataVencimento
    ? new Date(pagamento.dataVencimento)
    : new Date(ano, mes - 1, aluno.diaPagamento ?? 1);

  const valorCobrado =
    pagamento?.valorCobrado ?? aluno.valorCobranca ?? 0;

  const resultado = await enviarEmailAtraso({
    emailResponsavel: aluno.emailResponsavel,
    nomeResponsavel:  aluno.responsavel ?? aluno.emailResponsavel,
    nomeAluno:        aluno.nome,
    tipoCobranca:     aluno.tipoCobranca ?? "MENSAL",
    valorCobrado,
    dataVencimento,
    mes,
    ano,
    nomeProfessora,
    parcela: parcela > 1 ? parcela : undefined,
  });

  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

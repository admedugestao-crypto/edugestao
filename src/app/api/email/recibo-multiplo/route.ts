import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { enviarEmailReciboMultiplo, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/email/recibo-multiplo
// Body: { ids: string[] }
export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const session = await auth();

  if (!emailConfigurado()) {
    return NextResponse.json(
      { erro: "E-mail não configurado no servidor." },
      { status: 503 },
    );
  }

  const { ids } = await req.json() as { ids: string[] };
  if (!ids || ids.length === 0)
    return NextResponse.json({ erro: "Nenhum ID informado." }, { status: 400 });

  const pagamentos = await prisma.pagamento.findMany({
    where: { id: { in: ids }, empresaId: scope.empresaId, pago: true },
    include: {
      aluno: {
        include: {
          professora: { include: { usuario: { select: { nome: true } } } },
        },
      },
    },
    orderBy: [{ aluno: { nome: "asc" } }, { mes: "asc" }, { parcela: "asc" }],
  });

  if (pagamentos.length === 0)
    return NextResponse.json({ erro: "Nenhum pagamento pago encontrado." }, { status: 404 });

  // Agrupa por e-mail do responsável
  const grupos = new Map<string, typeof pagamentos>();
  for (const p of pagamentos) {
    const email = p.aluno.emailResponsavel;
    if (!email) continue;
    if (!grupos.has(email)) grupos.set(email, []);
    grupos.get(email)!.push(p);
  }

  if (grupos.size === 0)
    return NextResponse.json(
      { erro: "Nenhum responsável com e-mail cadastrado nos pagamentos selecionados." },
      { status: 422 },
    );

  const nomeProfessora =
    pagamentos[0].aluno.professora?.usuario?.nome ??
    (session?.user as any)?.name ?? "Professor(a)";

  const erros: string[] = [];
  let enviados = 0;

  for (const [emailResponsavel, grupo] of grupos) {
    const primeiro = grupo[0].aluno;
    const nomeResponsavel = primeiro.responsavel ?? emailResponsavel;
    const total = grupo.reduce((s, p) => s + p.valorCobrado, 0);

    const itens = grupo.map((p) => ({
      nomeAluno:      p.aluno.nome,
      tipoCobranca:   p.aluno.tipoCobranca ?? "MENSAL",
      valorCobrado:   p.valorCobrado,
      dataPagamento:  p.dataPagamento!,
      mes:            p.mes,
      ano:            p.ano,
      parcela:        p.parcela > 1 ? p.parcela : undefined,
      quantidadeAulas: p.quantidadeAulas,
    }));

    const resultado = await enviarEmailReciboMultiplo({
      emailResponsavel,
      nomeResponsavel,
      nomeProfessora,
      itens,
      total,
    });

    if (resultado.ok) {
      enviados++;
      await prisma.pagamento.updateMany({
        where: { id: { in: grupo.map((p) => p.id) } },
        data:  { emailTipo: "recibo", emailEnviadoEm: new Date() },
      });
    } else {
      erros.push(`${emailResponsavel}: ${resultado.erro}`);
    }
  }

  if (enviados === 0)
    return NextResponse.json({ erro: erros.join("; ") }, { status: 500 });

  return NextResponse.json({ ok: true, enviados, erros });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { enviarEmailCobrancaMultipla, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/email/cobranca-multipla
// Body: { ids: string[] }
// Unifica todos os pagamentos pendentes selecionados de um mesmo aluno em um
// único e-mail (lembrete e/ou atraso, conforme o vencimento de cada item).
export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const session = await auth();

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: scope.empresaId },
    select: { emailHost: true, emailPort: true, emailUser: true, emailPass: true, emailFrom: true },
  });
  if (!emailConfigurado(empresa)) {
    return NextResponse.json(
      { erro: "E-mail não configurado. Cadastre o SMTP desta empresa na Plataforma → Empresas → Editar → aba E-mail (SMTP)." },
      { status: 503 },
    );
  }

  const { ids } = await req.json() as { ids: string[] };
  if (!ids || ids.length === 0)
    return NextResponse.json({ erro: "Nenhum ID informado." }, { status: 400 });

  const pagamentos = await prisma.pagamento.findMany({
    where: { id: { in: ids }, empresaId: scope.empresaId, pago: false },
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
    return NextResponse.json({ erro: "Nenhuma cobrança pendente encontrada." }, { status: 404 });

  // Unifica por aluno — cada aluno recebe um único e-mail com todas as
  // parcelas pendentes selecionadas, mesmo que misture itens em atraso e a
  // vencer.
  const grupos = new Map<string, typeof pagamentos>();
  for (const p of pagamentos) {
    if (!p.aluno.emailResponsavel) continue;
    if (!grupos.has(p.alunoId)) grupos.set(p.alunoId, []);
    grupos.get(p.alunoId)!.push(p);
  }

  if (grupos.size === 0)
    return NextResponse.json(
      { erro: "Nenhum responsável com e-mail cadastrado nos pagamentos selecionados." },
      { status: 422 },
    );

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  const erros: string[] = [];
  let enviados = 0;

  for (const grupo of grupos.values()) {
    const aluno = grupo[0].aluno;
    const emailResponsavel = aluno.emailResponsavel!;
    const nomeResponsavel = aluno.responsavel ?? emailResponsavel;
    const nomeProfessora = aluno.professora?.usuario?.nome ?? (session?.user as any)?.name ?? "Professor(a)";
    const total = grupo.reduce((s, p) => s + Number(p.valorCobrado), 0);

    const itens = grupo.map((p) => {
      // atrasado só a partir do dia seguinte ao vencimento — mesma regra do status() da UI
      const venc = new Date(p.dataVencimento);
      const vencMaisUm = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate() + 1);
      return {
        tipoCobranca:   aluno.tipoCobranca ?? "MENSAL",
        valorCobrado:   Number(p.valorCobrado),
        dataVencimento: p.dataVencimento,
        mes:            p.mes,
        ano:            p.ano,
        parcela:        p.parcela > 1 ? p.parcela : undefined,
        atrasado:       vencMaisUm < hoje,
      };
    });

    const resultado = await enviarEmailCobrancaMultipla({
      emailResponsavel,
      nomeResponsavel,
      nomeAluno: aluno.nome,
      nomeProfessora,
      itens,
      total,
    }, empresa);

    if (resultado.ok) {
      enviados++;
      const tipoPredominante = itens.some((i) => i.atrasado) ? "atraso" : "lembrete";
      await prisma.pagamento.updateMany({
        where: { id: { in: grupo.map((p) => p.id) } },
        data:  { emailTipo: tipoPredominante, emailEnviadoEm: new Date() },
      });
    } else {
      erros.push(`${aluno.nome}: ${resultado.erro}`);
    }
  }

  if (enviados === 0)
    return NextResponse.json({ erro: erros.join("; ") }, { status: 500 });

  return NextResponse.json({ ok: true, enviados, erros });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function diasNoMes(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate();
}

// POST /api/pagamentos/gerar
// Body: { mes, ano }
// Para cada aluno com aulas AGENDADAS no mês, cria/atualiza 1 registro de pagamento.
// Não sobrescreve registros já pagos.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const professoraId = (session.user as any)?.professoraId as string | null;
  const perfil       = (session.user as any)?.perfil as string;

  const { mes, ano } = await req.json() as { mes: number; ano: number };
  if (!mes || !ano)
    return NextResponse.json({ erro: "mes e ano são obrigatórios" }, { status: 400 });

  // ── Range UTC do mês ────────────────────────────────────────────────────────
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
  const fimMes    = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  // ── Busca aulas AGENDADAS do mês ────────────────────────────────────────────
  const whereAula: any = {
    status: "AGENDADA",
    data:   { gte: inicioMes, lte: fimMes },
  };
  if (professoraId) whereAula.professoraId = professoraId;
  else if (perfil !== "SUPERADMIN")
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const aulas = await prisma.agendaAula.findMany({
    where: whereAula,
    select: {
      alunoId: true,
      aluno: {
        select: {
          id: true, valorCobranca: true, diaPagamento: true,
        },
      },
    },
  });

  // ── Agrupa por aluno ────────────────────────────────────────────────────────
  const porAluno = new Map<string, { valorCobranca: number; diaPagamento: number | null; qtd: number }>();
  for (const aula of aulas) {
    const prev = porAluno.get(aula.alunoId);
    if (prev) {
      prev.qtd++;
    } else {
      porAluno.set(aula.alunoId, {
        valorCobranca: aula.aluno.valorCobranca ?? 0,
        diaPagamento:  aula.aluno.diaPagamento,
        qtd:           1,
      });
    }
  }

  // ── Upsert: cria se não existe, mantém dados se já existe ──────────────────
  let criadas   = 0;
  let existentes = 0;

  await Promise.all(
    Array.from(porAluno.entries()).map(async ([alunoId, info]) => {
      const diaVenc = info.diaPagamento ?? diasNoMes(mes, ano);
      const dataVencimento = new Date(ano, mes - 1, diaVenc);

      const result = await prisma.pagamento.upsert({
        where: { alunoId_mes_ano_parcela: { alunoId, mes, ano, parcela: 1 } },
        update: {
          // Só atualiza quantidade de aulas se ainda não foi pago
          quantidadeAulas: info.qtd,
        },
        create: {
          alunoId,
          mes,
          ano,
          parcela:         1,
          dataVencimento,
          valorCobrado:    info.valorCobranca,
          quantidadeAulas: info.qtd,
          pago:            false,
        },
      });

      // criadoEm ≈ atualizadoEm → novo registro
      const diff = Math.abs(result.criadoEm.getTime() - result.atualizadoEm.getTime());
      if (diff < 1000) criadas++;
      else existentes++;
    }),
  );

  return NextResponse.json({ criadas, existentes });
}

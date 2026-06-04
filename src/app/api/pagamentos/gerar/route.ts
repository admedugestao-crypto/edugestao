import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function diasNoMes(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate();
}

// POST /api/pagamentos/gerar
// Body: { mes, ano }
// Para cada aluno, conta aulas do mês (exceto CANCELADA e FALTA_PROFESSOR)
// e gera 1 registro: valorCobrado = qtdAulas × valorPorAula.
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

  const isAdmin = perfil === "SUPERADMIN";

  if (!isAdmin && !professoraId)
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  // ── Busca aulas do mês (exceto CANCELADA e FALTA_PROFESSOR) ────────────────
  // Conta todas as aulas previstas/realizadas/falta-aluno para calcular o total
  // do mês. CANCELADA e FALTA_PROFESSOR não são cobradas.
  const whereAula: any = {
    status: { notIn: ["CANCELADA", "FALTA_PROFESSOR"] },
    data:   { gte: inicioMes, lte: fimMes },
  };
  // Admin vê aulas de todas as professoras; professora vê só as próprias
  if (!isAdmin && professoraId) whereAula.professoraId = professoraId;

  const aulas = await prisma.agendaAula.findMany({
    where: whereAula,
    select: {
      alunoId: true,
      aluno: {
        select: {
          id: true, tipoCobranca: true, valorCobranca: true,
          diaPagamento: true, diaPagamento2: true,
          dataInicioContrato: true, dataFimContrato: true,
        },
      },
    },
  });

  // Limites do mês para verificação do período contratual
  const primeiroDiaMes = new Date(Date.UTC(ano, mes - 1, 1));
  const ultimoDiaMes   = new Date(Date.UTC(ano, mes, 0));   // último dia do mês

  // ── Agrupa por aluno (respeita período contratual) ──────────────────────────
  type InfoAluno = {
    tipoCobranca:  string;
    valorCobranca: number;
    diaPagamento:  number | null;
    diaPagamento2: number | null;
    qtd:           number;
  };
  const porAluno = new Map<string, InfoAluno>();
  for (const aula of aulas) {
    const { dataInicioContrato, dataFimContrato } = aula.aluno;

    // Aluno sem contrato definido não gera pagamento
    if (!dataInicioContrato && !dataFimContrato) continue;

    // Verifica se o contrato cobre algum dia do mês solicitado
    if (dataFimContrato) {
      const fimContrato = new Date(dataFimContrato); fimContrato.setUTCHours(0,0,0,0);
      if (fimContrato < primeiroDiaMes) continue;
    }
    if (dataInicioContrato) {
      const inicioContrato = new Date(dataInicioContrato); inicioContrato.setUTCHours(0,0,0,0);
      if (inicioContrato > ultimoDiaMes) continue;
    }

    const prev = porAluno.get(aula.alunoId);
    if (prev) {
      prev.qtd++;
    } else {
      porAluno.set(aula.alunoId, {
        tipoCobranca:  aula.aluno.tipoCobranca  ?? "MENSAL",
        valorCobranca: aula.aluno.valorCobranca ?? 0,
        diaPagamento:  aula.aluno.diaPagamento,
        diaPagamento2: aula.aluno.diaPagamento2,
        qtd:           1,
      });
    }
  }

  // ── Calcula valorCobrado: sempre valorPorAula × qtdAulas ──────────────────
  // O tipoCobranca define a frequência de cobrança (quando cobrar),
  // mas o valor sempre é: valorCadastrado × quantidade de aulas realizadas/falta aluno.
  function calcularValor(valorUnit: number, qtd: number): number {
    return valorUnit * qtd;
  }

  // ── Upsert: cria se não existe, atualiza qtd/valor se não pago ────────────
  let criadas    = 0;
  let existentes = 0;

  await Promise.all(
    Array.from(porAluno.entries()).map(async ([alunoId, info]) => {
      const valorCobrado = calcularValor(info.valorCobranca, info.qtd);

      // Parcela 1 — vencimento no diaPagamento (ou último dia do mês)
      const diaVenc1 = info.diaPagamento ?? diasNoMes(mes, ano);
      const dataVenc1 = new Date(ano, mes - 1, diaVenc1);

      const result1 = await prisma.pagamento.upsert({
        where: { alunoId_mes_ano_parcela: { alunoId, mes, ano, parcela: 1 } },
        update: {
          quantidadeAulas: info.qtd,
          valorCobrado,
        },
        create: {
          alunoId, mes, ano, parcela: 1,
          dataVencimento:  dataVenc1,
          valorCobrado,
          quantidadeAulas: info.qtd,
          pago:            false,
          origemManual:    false,
        },
      });
      const diff1 = Math.abs(result1.criadoEm.getTime() - result1.atualizadoEm.getTime());
      if (diff1 < 1000) criadas++; else existentes++;

      // Parcela 2 — apenas QUINZENAL (diaPagamento2)
      if (info.tipoCobranca === "QUINZENAL" && info.diaPagamento2) {
        const dataVenc2 = new Date(ano, mes - 1, info.diaPagamento2);
        const result2 = await prisma.pagamento.upsert({
          where: { alunoId_mes_ano_parcela: { alunoId, mes, ano, parcela: 2 } },
          update: { quantidadeAulas: info.qtd, valorCobrado },
          create: {
            alunoId, mes, ano, parcela: 2,
            dataVencimento:  dataVenc2,
            valorCobrado,
            quantidadeAulas: info.qtd,
            pago:            false,
            origemManual:    false,
          },
        });
        const diff2 = Math.abs(result2.criadoEm.getTime() - result2.atualizadoEm.getTime());
        if (diff2 < 1000) criadas++; else existentes++;
      }
    }),
  );

  return NextResponse.json({ criadas, existentes });
}

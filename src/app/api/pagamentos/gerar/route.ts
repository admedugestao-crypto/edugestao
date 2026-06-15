import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function diasNoMes(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate();
}

/**
 * Retorna todas as datas do mês (local) cujo dia-da-semana coincide com `diaSemana`.
 * diaSemana: 0=Dom … 6=Sáb (igual a Date.getDay())
 */
function ocorrenciasDiaSemana(diaSemana: number, mes: number, ano: number): Date[] {
  const resultado: Date[] = [];
  const total = diasNoMes(mes, ano);
  for (let d = 1; d <= total; d++) {
    const dt = new Date(ano, mes - 1, d);
    if (dt.getDay() === diaSemana) resultado.push(dt);
  }
  return resultado;
}

// POST /api/pagamentos/gerar
// Body: { mes, ano }
// Para cada aluno, conta aulas do mês (exceto CANCELADA e FALTA_PROFESSOR)
// e gera registros de pagamento conforme o tipoCobranca:
//   MENSAL/POR_AULA → 1 parcela (diaPagamento)
//   QUINZENAL       → 2 parcelas (diaPagamento + diaPagamento2)
//   SEMANAL         → N parcelas = ocorrências do diaSemanaCobranca no mês
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

  // ── Busca apenas aulas REALIZADA do mês ────────────────────────────────────
  const whereAula: any = {
    status: { in: ["REALIZADA", "FALTA_ALUNO"] },
    data:   { gte: inicioMes, lte: fimMes },
  };
  if (!isAdmin && professoraId) whereAula.professoraId = professoraId;

  const aulas = await prisma.agendaAula.findMany({
    where: whereAula,
    select: {
      id:      true,
      alunoId: true,
      data:    true,   // necessário para agrupar por semana (SEMANAL)
      aluno: {
        select: {
          id: true, tipoCobranca: true, valorCobranca: true,
          diaPagamento: true, diaPagamento2: true,
          diaSemanaCobranca: true,
          dataInicioContrato: true, dataFimContrato: true,
        },
      },
    },
  });

  // Limites do mês para verificação do período contratual
  const primeiroDiaMes = new Date(Date.UTC(ano, mes - 1, 1));
  const ultimoDiaMes   = new Date(Date.UTC(ano, mes, 0));

  // ── Agrupa por aluno (respeita período contratual) ──────────────────────────
  type AulaInfo = { id: string; data: Date };
  type InfoAluno = {
    tipoCobranca:      string;
    valorCobranca:     number;
    diaPagamento:      number | null;
    diaPagamento2:     number | null;
    diaSemanaCobranca: number | null;
    aulas:             AulaInfo[];
  };
  const porAluno = new Map<string, InfoAluno>();

  for (const aula of aulas) {
    const { dataInicioContrato, dataFimContrato } = aula.aluno;

    // Aluno sem contrato definido não gera pagamento
    if (!dataInicioContrato && !dataFimContrato) continue;

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
      prev.aulas.push({ id: aula.id, data: aula.data });
    } else {
      porAluno.set(aula.alunoId, {
        tipoCobranca:      aula.aluno.tipoCobranca      ?? "MENSAL",
        valorCobranca:     aula.aluno.valorCobranca      ?? 0,
        diaPagamento:      aula.aluno.diaPagamento,
        diaPagamento2:     aula.aluno.diaPagamento2,
        diaSemanaCobranca: aula.aluno.diaSemanaCobranca  ?? null,
        aulas:             [{ id: aula.id, data: aula.data }],
      });
    }
  }

  // ── Upsert: cria se não existe, atualiza qtd/valor se não pago ────────────
  let criadas    = 0;
  let existentes = 0;

  async function upsertParcela(
    alunoId: string,
    parcela: number,
    dataVencimento: Date,
    valorCobrado: number,
    quantidadeAulas: number,
    aulaIds: string[],
  ) {
    const result = await prisma.pagamento.upsert({
      where: { alunoId_mes_ano_parcela: { alunoId, mes, ano, parcela } },
      update: { quantidadeAulas, valorCobrado },
      create: {
        alunoId, mes, ano, parcela,
        dataVencimento,
        valorCobrado,
        quantidadeAulas,
        pago:         false,
        origemManual: false,
      },
    });
    await prisma.pagamentoAula.deleteMany({ where: { pagamentoId: result.id } });
    if (aulaIds.length > 0) {
      await prisma.pagamentoAula.createMany({
        data: aulaIds.map((agendaAulaId) => ({ pagamentoId: result.id, agendaAulaId })),
        skipDuplicates: true,
      });
    }
    const diff = Math.abs(result.criadoEm.getTime() - result.atualizadoEm.getTime());
    if (diff < 1000) criadas++; else existentes++;
  }

  await Promise.all(
    Array.from(porAluno.entries()).map(async ([alunoId, info]) => {
      const totalQtd    = info.aulas.length;
      const totalValor  = info.valorCobranca * totalQtd;

      // ── SEMANAL: uma parcela por ocorrência do diaSemanaCobranca no mês ─────
      if (info.tipoCobranca === "SEMANAL" && info.diaSemanaCobranca !== null) {
        const ocorrencias = ocorrenciasDiaSemana(info.diaSemanaCobranca, mes, ano);
        if (ocorrencias.length === 0) {
          // fallback improvável: cria parcela única no último dia
          await upsertParcela(
            alunoId, 1,
            new Date(ano, mes - 1, diasNoMes(mes, ano)),
            totalValor, totalQtd,
            info.aulas.map((a) => a.id),
          );
          return;
        }

        // Distribui aulas entre as ocorrências:
        // cada aula vai para a ocorrência mais próxima igual ou posterior à data da aula.
        // Se não houver próxima, vai para a última ocorrência.
        const grupos: AulaInfo[][] = ocorrencias.map(() => []);
        for (const aula of info.aulas) {
          const aulaDate = new Date(aula.data);
          aulaDate.setUTCHours(0, 0, 0, 0);
          let idx = ocorrencias.findIndex((oc) => oc >= aulaDate);
          if (idx === -1) idx = ocorrencias.length - 1;
          grupos[idx].push(aula);
        }

        for (let i = 0; i < ocorrencias.length; i++) {
          const aulasDaSemana = grupos[i];
          const qtd   = aulasDaSemana.length;
          const valor = info.valorCobranca * qtd;
          // Gera parcela mesmo sem aulas nessa semana (valor 0) para manter o vencimento visível
          await upsertParcela(
            alunoId, i + 1,
            ocorrencias[i],
            valor, qtd,
            aulasDaSemana.map((a) => a.id),
          );
        }
        return;
      }

      // ── MENSAL / POR_AULA / SEMANAL sem diaSemanaCobranca → parcela única ───
      const diaVenc1  = info.diaPagamento ?? diasNoMes(mes, ano);
      await upsertParcela(
        alunoId, 1,
        new Date(ano, mes - 1, diaVenc1),
        totalValor, totalQtd,
        info.aulas.map((a) => a.id),
      );

      // ── QUINZENAL: parcela 2 ─────────────────────────────────────────────────
      if (info.tipoCobranca === "QUINZENAL" && info.diaPagamento2) {
        await upsertParcela(
          alunoId, 2,
          new Date(ano, mes - 1, info.diaPagamento2),
          totalValor, totalQtd,
          info.aulas.map((a) => a.id),
        );
      }
    }),
  );

  return NextResponse.json({ criadas, existentes });
}

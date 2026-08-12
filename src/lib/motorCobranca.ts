import { prisma } from "@/lib/prisma";

export function diasNoMes(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate();
}

/**
 * Retorna todas as datas do mês (local) cujo dia-da-semana coincide com `diaSemana`.
 * diaSemana: 0=Dom … 6=Sáb (igual a Date.getDay())
 */
export function ocorrenciasDiaSemana(diaSemana: number, mes: number, ano: number): Date[] {
  const resultado: Date[] = [];
  const total = diasNoMes(mes, ano);
  for (let d = 1; d <= total; d++) {
    const dt = new Date(ano, mes - 1, d);
    if (dt.getDay() === diaSemana) resultado.push(dt);
  }
  return resultado;
}

export type ConfigVencimento = {
  tipoCobranca: string;
  diaPagamento: number | null;
  diaPagamento2: number | null;
  diaSemanaCobranca: number | null;
};

// Calcula o vencimento de UMA aula, a partir da configuração de cobrança do
// aluno. tipoCobranca só decide QUANDO vence — nunca agrupa aulas: cada aula
// billable gera seu próprio pagamento (ver gerarPagamentoAula).
export function calcularVencimentoAula(info: ConfigVencimento, dataAula: Date, mes: number, ano: number): Date {
  const diaVenc1 = info.diaPagamento ?? diasNoMes(mes, ano);

  if (info.tipoCobranca === "SEMANAL" && info.diaSemanaCobranca !== null) {
    const ocorrencias = ocorrenciasDiaSemana(info.diaSemanaCobranca, mes, ano);
    if (ocorrencias.length === 0) return new Date(ano, mes - 1, diasNoMes(mes, ano));
    const aulaDate = new Date(dataAula);
    aulaDate.setUTCHours(0, 0, 0, 0);
    const idx = ocorrencias.findIndex((oc) => oc >= aulaDate);
    return idx === -1 ? ocorrencias[ocorrencias.length - 1] : ocorrencias[idx];
  }

  if (info.tipoCobranca === "QUINZENAL" && info.diaPagamento2) {
    return new Date(dataAula).getUTCDate() <= 15
      ? new Date(ano, mes - 1, diaVenc1)
      : new Date(ano, mes - 1, info.diaPagamento2);
  }

  // MENSAL / POR_AULA / demais casos
  return new Date(ano, mes - 1, diaVenc1);
}

export type ParcelaGerada = {
  parcela: number;
  dataVencimento: Date;
  valorCobrado: number;
  quantidadeAulas: number;
  aulaIds: string[];
  pagoAnteriormente: number | null;
};

export type ResultadoGeracao =
  | { semCobranca: true }
  | { semCobranca: false; parcela: ParcelaGerada };

// Gera (ou atualiza) o pagamento de UMA aula específica. Cada AgendaAula
// billable (REALIZADA/FALTA_ALUNO) corresponde a exatamente 1 Pagamento —
// nunca agrupa aulas num mesmo registro. Um pagamento já pago nunca é
// alterado por aqui.
export async function gerarPagamentoAula(empresaId: string, agendaAulaId: string): Promise<ResultadoGeracao> {
  const aula = await prisma.agendaAula.findFirst({
    where: { id: agendaAulaId, empresaId },
    select: { id: true, alunoId: true, data: true, status: true },
  });
  if (!aula || (aula.status !== "REALIZADA" && aula.status !== "FALTA_ALUNO")) return { semCobranca: true };

  const aluno = await prisma.aluno.findUnique({
    where: { id: aula.alunoId },
    select: {
      tipoCobranca: true, valorCobranca: true,
      diaPagamento: true, diaPagamento2: true,
      diaSemanaCobranca: true,
      dataInicioContrato: true, dataFimContrato: true,
    },
  });
  if (!aluno) return { semCobranca: true };

  const { dataInicioContrato, dataFimContrato } = aluno;
  if (!dataInicioContrato && !dataFimContrato) return { semCobranca: true };

  const mes = aula.data.getUTCMonth() + 1;
  const ano = aula.data.getUTCFullYear();
  const primeiroDiaMes = new Date(Date.UTC(ano, mes - 1, 1));
  const ultimoDiaMes = new Date(Date.UTC(ano, mes, 0));

  if (dataFimContrato) {
    const fimContrato = new Date(dataFimContrato); fimContrato.setUTCHours(0, 0, 0, 0);
    if (fimContrato < primeiroDiaMes) return { semCobranca: true };
  }
  if (dataInicioContrato) {
    const inicioContrato = new Date(dataInicioContrato); inicioContrato.setUTCHours(0, 0, 0, 0);
    if (inicioContrato > ultimoDiaMes) return { semCobranca: true };
  }

  const valorCobranca = aluno.valorCobranca != null ? Number(aluno.valorCobranca) : 0;
  const dataVencimento = calcularVencimentoAula(
    { ...aluno, tipoCobranca: aluno.tipoCobranca ?? "MENSAL" },
    aula.data, mes, ano,
  );

  const vinculo = await prisma.pagamentoAula.findFirst({
    where: { agendaAulaId },
    select: { pagamentoId: true, pagamento: { select: { parcela: true, pago: true, valorCobrado: true } } },
  });

  if (vinculo) {
    if (vinculo.pagamento.pago) {
      return {
        semCobranca: false,
        parcela: {
          parcela: vinculo.pagamento.parcela,
          dataVencimento,
          valorCobrado: Number(vinculo.pagamento.valorCobrado),
          quantidadeAulas: 1,
          aulaIds: [agendaAulaId],
          pagoAnteriormente: Number(vinculo.pagamento.valorCobrado),
        },
      };
    }

    const outrosVinculos = await prisma.pagamentoAula.count({ where: { pagamentoId: vinculo.pagamentoId } });
    if (outrosVinculos > 1) {
      // Registro legado agregado (de antes do backfill) — nunca reduz o valor
      // de um pagamento que ainda cobre outras aulas.
      console.error(`gerarPagamentoAula: pagamento ${vinculo.pagamentoId} ainda agrupa ${outrosVinculos} aulas — não tocado.`);
      return {
        semCobranca: false,
        parcela: {
          parcela: vinculo.pagamento.parcela,
          dataVencimento,
          valorCobrado: Number(vinculo.pagamento.valorCobrado),
          quantidadeAulas: outrosVinculos,
          aulaIds: [agendaAulaId],
          pagoAnteriormente: null,
        },
      };
    }

    const atualizado = await prisma.pagamento.update({
      where: { id: vinculo.pagamentoId },
      data: { dataVencimento, valorCobrado: valorCobranca, quantidadeAulas: 1 },
    });
    return {
      semCobranca: false,
      parcela: {
        parcela: atualizado.parcela,
        dataVencimento,
        valorCobrado: Number(atualizado.valorCobrado),
        quantidadeAulas: 1,
        aulaIds: [agendaAulaId],
        pagoAnteriormente: null,
      },
    };
  }

  const agg = await prisma.pagamento.aggregate({
    where: { alunoId: aula.alunoId, mes, ano },
    _max: { parcela: true },
  });
  const parcela = (agg._max.parcela ?? 0) + 1;

  const criado = await prisma.pagamento.create({
    data: {
      empresaId,
      alunoId: aula.alunoId, mes, ano, parcela,
      dataVencimento,
      valorCobrado: valorCobranca,
      quantidadeAulas: 1,
      pago: false,
      origemManual: false,
    },
  });
  await prisma.pagamentoAula.create({ data: { pagamentoId: criado.id, agendaAulaId } });

  return {
    semCobranca: false,
    parcela: {
      parcela,
      dataVencimento,
      valorCobrado: valorCobranca,
      quantidadeAulas: 1,
      aulaIds: [agendaAulaId],
      pagoAnteriormente: null,
    },
  };
}

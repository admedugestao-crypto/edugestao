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

export type AulaInfo = { id: string; data: Date };

export type InfoAluno = {
  tipoCobranca: string;
  valorCobranca: number;
  diaPagamento: number | null;
  diaPagamento2: number | null;
  diaSemanaCobranca: number | null;
  aulas: AulaInfo[];
};

export type ParcelaCalculada = {
  parcela: number;
  dataVencimento: Date;
  valorCobrado: number;
  quantidadeAulas: number;
  aulaIds: string[];
};

// Calcula as parcelas de um aluno para o mês, a partir das aulas já filtradas
// (billable e dentro do período contratual). Função pura — sem acesso a banco.
export function calcularParcelasAluno(info: InfoAluno, mes: number, ano: number): ParcelaCalculada[] {
  const parcelas: ParcelaCalculada[] = [];
  const diaVenc1 = info.diaPagamento ?? diasNoMes(mes, ano);

  function registrar(parcela: number, vencimento: Date, aulasParcela: AulaInfo[]) {
    parcelas.push({
      parcela,
      dataVencimento: vencimento,
      valorCobrado: info.valorCobranca * aulasParcela.length,
      quantidadeAulas: aulasParcela.length,
      aulaIds: aulasParcela.map((a) => a.id),
    });
  }

  // ── SEMANAL: uma parcela por ocorrência do diaSemanaCobranca no mês ─────
  if (info.tipoCobranca === "SEMANAL" && info.diaSemanaCobranca !== null) {
    const ocorrencias = ocorrenciasDiaSemana(info.diaSemanaCobranca, mes, ano);
    if (ocorrencias.length === 0) {
      // fallback improvável: cria parcela única no último dia
      registrar(1, new Date(ano, mes - 1, diasNoMes(mes, ano)), info.aulas);
    } else {
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

      let parcela = 1;
      for (let i = 0; i < ocorrencias.length; i++) {
        const aulasDaSemana = grupos[i];
        if (aulasDaSemana.length === 0) continue; // pula semanas sem aulas
        registrar(parcela++, ocorrencias[i], aulasDaSemana);
      }
    }
  } else if (info.tipoCobranca === "QUINZENAL" && info.diaPagamento2) {
    // ── QUINZENAL: divide as aulas pela quinzena da data ──────────────────
    // Dias 1–15 → parcela 1 (diaPagamento); dias 16+ → parcela 2
    // (diaPagamento2). Quinzena sem aula não gera parcela.
    const q1 = info.aulas.filter((a) => new Date(a.data).getUTCDate() <= 15);
    const q2 = info.aulas.filter((a) => new Date(a.data).getUTCDate() > 15);
    if (q1.length > 0) registrar(1, new Date(ano, mes - 1, diaVenc1), q1);
    if (q2.length > 0) registrar(2, new Date(ano, mes - 1, info.diaPagamento2), q2);
  } else {
    // ── MENSAL / POR_AULA / demais casos → parcela única ───────────────────
    registrar(1, new Date(ano, mes - 1, diaVenc1), info.aulas);
  }

  return parcelas;
}

// Busca as aulas billable (REALIZADA/FALTA_ALUNO) de um aluno no mês, respeitando
// o período contratual.
async function buscarInfoAluno(
  empresaId: string,
  alunoId: string,
  mes: number,
  ano: number,
  professoraId?: string,
): Promise<InfoAluno | { semCobranca: true }> {
  const aluno = await prisma.aluno.findFirst({
    where: { id: alunoId, empresaId },
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

  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
  const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  const aulas = await prisma.agendaAula.findMany({
    where: {
      empresaId,
      alunoId,
      reposicao: false,
      data: { gte: inicioMes, lte: fimMes },
      status: { in: ["REALIZADA", "FALTA_ALUNO"] },
      ...(professoraId ? { professoraId } : {}),
    },
    select: { id: true, data: true },
  });

  if (aulas.length === 0) return { semCobranca: true };

  return {
    tipoCobranca: aluno.tipoCobranca ?? "MENSAL",
    valorCobranca: aluno.valorCobranca != null ? Number(aluno.valorCobranca) : 0,
    diaPagamento: aluno.diaPagamento,
    diaPagamento2: aluno.diaPagamento2,
    diaSemanaCobranca: aluno.diaSemanaCobranca ?? null,
    aulas,
  };
}

async function upsertParcela(
  empresaId: string,
  alunoId: string,
  mes: number,
  ano: number,
  p: ParcelaCalculada,
) {
  const result = await prisma.pagamento.upsert({
    where: { alunoId_mes_ano_parcela: { alunoId, mes, ano, parcela: p.parcela } },
    update: { quantidadeAulas: p.quantidadeAulas, valorCobrado: p.valorCobrado },
    create: {
      empresaId,
      alunoId, mes, ano, parcela: p.parcela,
      dataVencimento: p.dataVencimento,
      valorCobrado: p.valorCobrado,
      quantidadeAulas: p.quantidadeAulas,
      pago: false,
      origemManual: false,
    },
  });
  await prisma.pagamentoAula.deleteMany({ where: { pagamentoId: result.id } });
  if (p.aulaIds.length > 0) {
    await prisma.pagamentoAula.createMany({
      data: p.aulaIds.map((agendaAulaId) => ({ pagamentoId: result.id, agendaAulaId })),
      skipDuplicates: true,
    });
  }
  const criada = Math.abs(result.criadoEm.getTime() - result.atualizadoEm.getTime()) < 1000;
  return criada;
}

export type ParcelaGerada = ParcelaCalculada & { pagoAnteriormente: number | null };

export type ResultadoGeracao =
  | { semCobranca: true }
  | { semCobranca: false; criadas: number; existentes: number; parcelas: ParcelaGerada[] };

// Gera (grava) os pagamentos de um aluno para o mês/ano, a partir das aulas
// billable (REALIZADA/FALTA_ALUNO) já registradas. `pagoAnteriormente` informa,
// por parcela, se já havia um pagamento quitado que teve o valor atualizado —
// pra quem chama poder avisar sobre isso.
export async function gerarPagamentosAluno(
  empresaId: string,
  alunoId: string,
  mes: number,
  ano: number,
  opts: { professoraId?: string } = {},
): Promise<ResultadoGeracao> {
  const info = await buscarInfoAluno(empresaId, alunoId, mes, ano, opts.professoraId);
  if ("semCobranca" in info) return { semCobranca: true };

  const parcelas = calcularParcelasAluno(info, mes, ano);

  const existentes = await prisma.pagamento.findMany({
    where: { alunoId, mes, ano, parcela: { in: parcelas.map((p) => p.parcela) } },
    select: { parcela: true, pago: true, valorCobrado: true },
  });
  const porParcela = new Map(existentes.map((e) => [e.parcela, e]));

  let criadas = 0;
  let existentesCount = 0;
  const geradas: number[] = [];
  for (const p of parcelas) {
    const criada = await upsertParcela(empresaId, alunoId, mes, ano, p);
    if (criada) criadas++; else existentesCount++;
    geradas.push(p.parcela);
  }

  // Limpa parcelas automáticas não pagas que não foram regeradas nesta rodada.
  await prisma.pagamento.deleteMany({
    where: {
      alunoId, mes, ano,
      pago: false,
      origemManual: false,
      parcela: { notIn: geradas },
    },
  });

  return {
    semCobranca: false,
    criadas,
    existentes: existentesCount,
    parcelas: parcelas.map((p) => {
      const existente = porParcela.get(p.parcela);
      return { ...p, pagoAnteriormente: existente?.pago ? Number(existente.valorCobrado) : null };
    }),
  };
}

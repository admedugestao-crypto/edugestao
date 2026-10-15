export const PERIODICIDADES_AGENDA = ["SEMANAL", "QUINZENAL", "MENSAL"] as const;
export type PeriodicidadeAgenda = typeof PERIODICIDADES_AGENDA[number];
export type HorarioAgenda = { diaSemana: number; horaAula: string; dataPrimeiraAula?: string; geraFatura?: boolean };
const DIA_MS = 86400000;

export function descricaoHorarioAgenda(horario: HorarioAgenda, frequencia: PeriodicidadeAgenda): string {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  if (frequencia === "MENSAL") {
    const referencia = horario.dataPrimeiraAula ? dataAgenda(horario.dataPrimeiraAula) : null;
    return `${referencia ? `Dia ${referencia.getUTCDate()}` : "Referência não informada"} · ${horario.horaAula} · mensal`;
  }
  return `${dias[horario.diaSemana]} · ${horario.horaAula} · ${frequencia === "QUINZENAL" ? "a cada 14 dias" : "semanal"}`;
}

export function dataAgenda(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor ? data : null;
}

export function lerAgendaCadastro(periodicidade: unknown, valor: unknown, padrao: PeriodicidadeAgenda = "SEMANAL") {
  const frequencia = periodicidade ?? padrao;
  if (!PERIODICIDADES_AGENDA.includes(frequencia as PeriodicidadeAgenda)) return { erro: "Periodicidade da agenda inválida." };
  let lista: unknown;
  try { lista = JSON.parse(typeof valor === "string" ? valor : "[]"); }
  catch { return { erro: "Horários da agenda inválidos." }; }
  if (!Array.isArray(lista) || lista.length > 32) return { erro: "Informe até 32 horários válidos." };
  const horarios: HorarioAgenda[] = [];
  for (const item of lista) {
    if (!item || typeof item !== "object" || !Number.isInteger(item.diaSemana) || item.diaSemana < 0 || item.diaSemana > 6 || typeof item.horaAula !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.horaAula)) return { erro: "Dia ou horário da agenda inválido." };
    if (item.geraFatura !== undefined && typeof item.geraFatura !== "boolean") return { erro: "A opção de gerar fatura da agenda é inválida." };
    const referencia = typeof item.dataPrimeiraAula === "string" && item.dataPrimeiraAula ? dataAgenda(item.dataPrimeiraAula) : null;
    if ((item.dataPrimeiraAula && !referencia) || (frequencia !== "SEMANAL" && !referencia)) return { erro: "Informe uma data válida da primeira aula em cada horário quinzenal ou mensal." };
    if (referencia && frequencia !== "MENSAL" && referencia.getUTCDay() !== item.diaSemana) return { erro: "A primeira aula deve corresponder ao dia da semana escolhido." };
    horarios.push({
      diaSemana: frequencia === "MENSAL" && referencia ? referencia.getUTCDay() : item.diaSemana,
      horaAula: item.horaAula,
      geraFatura: item.geraFatura !== false,
      ...(referencia ? { dataPrimeiraAula: item.dataPrimeiraAula } : {}),
    });
  }
  return { dados: { periodicidadeAgenda: frequencia as PeriodicidadeAgenda, agendaSemanal: horarios } };
}

// A referência original é mantida mesmo após feriados, meses menores ou nova geração.
export function datasRecorrencia(horario: HorarioAgenda, frequencia: PeriodicidadeAgenda, inicio: Date, fim: Date): Date[] {
  const referencia = horario.dataPrimeiraAula ? dataAgenda(horario.dataPrimeiraAula) : null;
  if (frequencia !== "SEMANAL" && !referencia) throw new Error("Data da primeira aula não informada.");
  if (inicio > fim) return [];
  const datas: Date[] = [];
  if (frequencia === "MENSAL" && referencia) {
    const ano = referencia.getUTCFullYear();
    const mes = referencia.getUTCMonth();
    const dia = referencia.getUTCDate();
    let deslocamento = Math.max(0, (inicio.getUTCFullYear() - ano) * 12 + inicio.getUTCMonth() - mes);
    while (true) {
      const ultimoDia = new Date(Date.UTC(ano, mes + deslocamento + 1, 0)).getUTCDate();
      const data = new Date(Date.UTC(ano, mes + deslocamento, Math.min(dia, ultimoDia)));
      if (data > fim) break;
      if (data >= inicio && data >= referencia) datas.push(data);
      deslocamento++;
    }
    return datas;
  }
  const passo = frequencia === "QUINZENAL" ? 14 : 7;
  let primeira = referencia ? new Date(referencia) : new Date(inicio);
  if (!referencia) primeira.setUTCDate(primeira.getUTCDate() + (horario.diaSemana - primeira.getUTCDay() + 7) % 7);
  if (primeira < inicio) primeira = new Date(primeira.getTime() + Math.ceil((inicio.getTime() - primeira.getTime()) / (passo * DIA_MS)) * passo * DIA_MS);
  for (let data = primeira; data <= fim; data = new Date(data.getTime() + passo * DIA_MS)) datas.push(data);
  return datas;
}

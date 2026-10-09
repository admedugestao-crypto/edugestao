import { PERIODOS_ESCOLARES } from "@/lib/periodosAvaliacao";

export const MEDIA_MINIMA_APROVACAO = 6;

type EscolaComPeriodos = {
  periodoAvaliacao: string | null;
  periodoLetivo1Inicio: Date | null;
  periodoLetivo1Fim: Date | null;
  periodoLetivo2Inicio: Date | null;
  periodoLetivo2Fim: Date | null;
};

export type PeriodoAtual = {
  numero: number;
  rotulo: string;
};

function inicioDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function contemData(inicio: Date, fim: Date, data: Date) {
  const alvo = inicioDoDia(data).getTime();
  return alvo >= inicioDoDia(inicio).getTime() && alvo <= inicioDoDia(fim).getTime();
}

function metadeDoIntervalo(inicio: Date, fim: Date) {
  const inicioMs = inicioDoDia(inicio).getTime();
  const fimMs = inicioDoDia(fim).getTime();
  return new Date(inicioMs + Math.floor((fimMs - inicioMs) / 2));
}

/**
 * Localiza a coluna da planilha que está vigente na data informada.
 *
 * Os dois períodos letivos cadastrados pela escola representam as duas
 * etapas do ano. Quando existem mais colunas de avaliação que etapas, as
 * colunas são distribuídas proporcionalmente dentro dessas etapas. Assim,
 * no modelo bimestral, os bimestres 1 e 2 ficam no primeiro período letivo
 * e os bimestres 3 e 4 no segundo.
 */
export function obterPeriodoAtual(escola: EscolaComPeriodos, hoje: Date): PeriodoAtual | null {
  const periodos = escola.periodoAvaliacao ? PERIODOS_ESCOLARES[escola.periodoAvaliacao] : undefined;
  const { periodoLetivo1Inicio: inicio1, periodoLetivo1Fim: fim1, periodoLetivo2Inicio: inicio2, periodoLetivo2Fim: fim2 } = escola;
  if (!periodos?.length || !inicio1 || !fim1 || !inicio2 || !fim2) return null;

  const quantidadeNoPrimeiroPeriodo = Math.ceil(periodos.length / 2);
  const quantidadeNoSegundoPeriodo = periodos.length - quantidadeNoPrimeiroPeriodo;
  let inicio: Date;
  let fim: Date;
  let quantidade: number;
  let deslocamento: number;

  if (contemData(inicio1, fim1, hoje)) {
    inicio = inicio1;
    fim = fim1;
    quantidade = quantidadeNoPrimeiroPeriodo;
    deslocamento = 0;
  } else if (contemData(inicio2, fim2, hoje)) {
    inicio = inicio2;
    fim = fim2;
    quantidade = quantidadeNoSegundoPeriodo;
    deslocamento = quantidadeNoPrimeiroPeriodo;
  } else {
    return null;
  }

  if (quantidade === 0) return null;
  if (quantidade === 1) return { numero: deslocamento + 1, rotulo: periodos[deslocamento] };

  const metade = metadeDoIntervalo(inicio, fim);
  const indiceNoPeriodo = inicioDoDia(hoje).getTime() <= metade.getTime() ? 0 : 1;
  const numero = deslocamento + indiceNoPeriodo + 1;
  return { numero, rotulo: periodos[numero - 1] };
}

export function anoLetivoEncerrado(escola: Pick<EscolaComPeriodos, "periodoLetivo2Fim">, hoje: Date) {
  return !!escola.periodoLetivo2Fim && inicioDoDia(hoje).getTime() > inicioDoDia(escola.periodoLetivo2Fim).getTime();
}

/** Mantém a última nota regular no acompanhamento até a próxima ser lançada. */
export function obterUltimaNotaDisponivel<T extends { periodo: number; valor: number }>(
  escola: EscolaComPeriodos,
  hoje: Date,
  notas: T[],
): { nota: T; rotulo: string } | null {
  const periodos = escola.periodoAvaliacao ? PERIODOS_ESCOLARES[escola.periodoAvaliacao] : undefined;
  if (!periodos?.length) return null;
  if (escola.periodoLetivo1Inicio && inicioDoDia(hoje) < inicioDoDia(escola.periodoLetivo1Inicio)) return null;

  const limite = obterPeriodoAtual(escola, hoje)?.numero ?? periodos.length;
  const nota = notas.reduce<T | null>((ultima, atual) => {
    if (atual.periodo < 1 || atual.periodo > limite || atual.periodo > periodos.length) return ultima;
    return !ultima || atual.periodo > ultima.periodo ? atual : ultima;
  }, null);
  return nota ? { nota, rotulo: periodos[nota.periodo - 1] } : null;
}

export function calcularMediaDasNotas(valores: number[]) {
  return valores.length ? valores.reduce((total, valor) => total + valor, 0) / valores.length : null;
}

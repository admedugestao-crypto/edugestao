// Converte uma string "YYYY-MM-DD" (vinda de <input type="date">) para a
// meia-noite LOCAL daquele dia, não meia-noite UTC.
//
// `new Date("2026-11-30")` é interpretado pelo JS como UTC (00:00:00Z), que em
// fusos negativos (ex: Brasília, UTC-3) já é "23/11 21:00" no horário local —
// um dia a menos quando lido de volta com getters locais (getDate, getMonth,
// setHours etc., como faz toda a lógica de geração de agenda e período letivo).
export function parseDataLocal(dataStr: string): Date {
  const [y, m, d] = dataStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Valida o período letivo de uma escola: cada período precisa terminar
// depois de começar, e o 2º período precisa começar depois do fim do 1º
// (evita datas cruzadas/sobrepostas entre os dois períodos).
export function validarPeriodoLetivo(datas: {
  periodoLetivo1Inicio: Date | null;
  periodoLetivo1Fim: Date | null;
  periodoLetivo2Inicio: Date | null;
  periodoLetivo2Fim: Date | null;
}): string | null {
  const { periodoLetivo1Inicio, periodoLetivo1Fim, periodoLetivo2Inicio, periodoLetivo2Fim } = datas;

  if (periodoLetivo1Inicio && periodoLetivo1Fim && periodoLetivo1Fim < periodoLetivo1Inicio) {
    return "O fim do 1º período não pode ser antes do início do 1º período.";
  }
  if (periodoLetivo2Inicio && periodoLetivo2Fim && periodoLetivo2Fim < periodoLetivo2Inicio) {
    return "O fim do 2º período não pode ser antes do início do 2º período.";
  }
  if (periodoLetivo1Fim && periodoLetivo2Inicio && periodoLetivo2Inicio <= periodoLetivo1Fim) {
    return "O início do 2º período precisa ser depois do fim do 1º período.";
  }
  return null;
}

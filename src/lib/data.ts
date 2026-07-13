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

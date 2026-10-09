export type SituacaoAgenda = "AGENDADA" | "REALIZADA" | "CANCELADA" | "FALTA_ALUNO" | "FALTA_PROFESSOR";
type AulaComSituacao = { data: string; status: SituacaoAgenda };
const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

export function dataHojeAgenda(agora = new Date()) {
  const partes = formatoDia.formatToParts(agora);
  const obter = (tipo: string) => partes.find((parte) => parte.type === tipo)!.value;
  return `${obter("year")}-${obter("month")}-${obter("day")}`;
}

export function aulaPendente(aula: AulaComSituacao, hoje = dataHojeAgenda()) {
  return aula.status === "AGENDADA" && aula.data.split("T")[0] < hoje;
}

const cores = {
  AGENDADA: { bg: "#f1f5f9", border: "#94a3b8", text: "#475569" },
  REALIZADA: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  CANCELADA: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  FALTA_ALUNO: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  FALTA_PROFESSOR: { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
};

export function coresAgenda(aula: AulaComSituacao, hoje = dataHojeAgenda()) {
  return aulaPendente(aula, hoje)
    ? { bg: "#dbeafe", border: "#2563eb", text: "#1d4ed8" }
    : cores[aula.status];
}

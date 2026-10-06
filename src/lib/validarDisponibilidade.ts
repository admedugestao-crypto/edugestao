const DIAS = new Set(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]);
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

type Horario = { dia: string; inicio: string; fim: string };

export function validarDisponibilidade(disponibilidade: unknown): string | null {
  if (!Array.isArray(disponibilidade)) return "Disponibilidade inválida.";
  const horarios = disponibilidade as Horario[];
  for (let i = 0; i < horarios.length; i++) {
    const h = horarios[i];
    if (!h || !DIAS.has(h.dia) || !HORA.test(h.inicio) || !HORA.test(h.fim)) return "Preencha dias e horários válidos.";
    if (h.inicio >= h.fim) return `Hora final deve ser maior que a inicial em ${h.dia}.`;
    for (let j = i + 1; j < horarios.length; j++) {
      const outro = horarios[j];
      if (outro && h.dia === outro.dia && h.inicio < outro.fim && outro.inicio < h.fim) {
        return `Existem horários sobrepostos em ${h.dia}.`;
      }
    }
  }
  return null;
}


export type Faixa = { dia: string; inicio: string; fim: string };
export function disponibilidadeConflita(anteriores: Faixa[], novas: Faixa[], aulas: { data: Date; horaInicio: string | null; horaFim: string | null }[]): boolean {
  const removidas = anteriores.filter(a => !novas.some(n => n.dia === a.dia && n.inicio <= a.inicio && n.fim >= a.fim));
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return aulas.some(a => removidas.some(f => f.dia === dias[a.data.getUTCDay()] && (!a.horaInicio || !a.horaFim || (a.horaInicio < f.fim && a.horaFim > f.inicio))));
}

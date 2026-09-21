import { prisma } from "@/lib/prisma";
import { disponibilidadeConflita, type Faixa } from "@/lib/validarDisponibilidade";
export const ERRO_DISPONIBILIDADE_OCUPADA = "Não é possível excluir ou reduzir este horário: existem aulas agendadas nessa faixa. Reagende ou cancele essas aulas antes de alterar a disponibilidade.";
export async function verificarDisponibilidadeOcupada(professoraId: string, empresaId: string, anteriores: unknown, novas: Faixa[]): Promise<boolean> {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const aulas = await prisma.agendaAula.findMany({ where: { empresaId, professoraId, status: "AGENDADA", data: { gte: hoje } }, select: { data: true, horaInicio: true, horaFim: true } });
  return disponibilidadeConflita(Array.isArray(anteriores) ? anteriores as Faixa[] : [], novas, aulas);
}

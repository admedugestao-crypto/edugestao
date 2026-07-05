import { prisma } from "./prisma";

// Busca a Aula Agendada vinculada a um conteúdo.
// Prioriza o vínculo exato (aulaId) — só cai para a busca por aluno+data
// (ambígua quando o aluno tem mais de uma aula no mesmo dia, ou quando o
// conteúdo nem representa uma aula específica) para conteúdos antigos ou
// criados manualmente, sem o vínculo direto.
//
// Retorna `ambigua: true` quando há mais de uma aula candidata compatível
// (ex: duas aulas da mesma matéria no mesmo dia) — nesse caso NÃO escolhe
// nenhuma (evita vincular errado), mas quem chama precisa saber que existem
// aulas, só que ambíguas, para não afirmar "não existe aula" por engano.
export async function buscarAulaVinculada(params: {
  aulaId?: string | null;
  alunoId: string;
  data: Date;
  materiaId?: string | null;
}): Promise<{ aula: Awaited<ReturnType<typeof prisma.agendaAula.findFirst>>; ambigua: boolean }> {
  if (params.aulaId) {
    const aula = await prisma.agendaAula.findUnique({ where: { id: params.aulaId } });
    return { aula, ambigua: false };
  }
  const dY = params.data.getUTCFullYear();
  const dM = params.data.getUTCMonth();
  const dD = params.data.getUTCDate();
  const candidatas = await prisma.agendaAula.findMany({
    where: {
      alunoId: params.alunoId,
      data: {
        gte: new Date(Date.UTC(dY, dM, dD)),
        lt:  new Date(Date.UTC(dY, dM, dD + 1)),
      },
    },
  });
  // Sem vínculo direto: só considera match se sobrar exatamente uma aula
  // compatível com a matéria do conteúdo (matéria diferente = não é a
  // mesma aula, mesmo que seja a única do dia — evita juntar conteúdo de
  // uma matéria com a aula de outra matéria no mesmo dia).
  const compativeis = candidatas.filter(
    (a) => !a.materiaId || !params.materiaId || a.materiaId === params.materiaId,
  );
  if (compativeis.length === 1) return { aula: compativeis[0], ambigua: false };
  return { aula: null, ambigua: compativeis.length > 1 };
}

// Validação de agenda para criar/editar conteúdo:
// Planejado  → agenda deve estar com status AGENDADA
// Ministrado → agenda deve estar com status REALIZADA
export async function validarAgenda(
  alunoId:   string,
  data:      Date,
  planejado: boolean,
  aulaId?:   string | null,
  materiaId?: string | null,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { aula, ambigua } = await buscarAulaVinculada({ aulaId, alunoId, data, materiaId });

  if (!aula) {
    return {
      ok: false,
      erro: ambigua
        ? "Este aluno tem mais de uma Aula Agendada nesta data/matéria — não dá para saber automaticamente qual delas vincular. Marque o status Realizada diretamente pela Agenda."
        : "Não existe Aula Agendada para este aluno nesta data.",
    };
  }

  const statusEsperado = planejado ? "AGENDADA" : "REALIZADA";
  if (aula.status !== statusEsperado) {
    return {
      ok: false,
      erro: planejado
        ? `Conteúdo planejado requer aula com status Agendada (atual: ${aula.status}).`
        : `Conteúdo ministrado requer aula com status Realizada (atual: ${aula.status}).`,
    };
  }

  return { ok: true };
}

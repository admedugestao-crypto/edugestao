import { prisma } from "./prisma";

export type AulaCandidata = {
  id: string;
  horaInicio: string | null;
  horaFim: string | null;
  status: string;
  materiaId: string | null; // legado — só pra exibição ("qual matéria" na lista de candidatas)
  materia: { nome: string; cor: string } | null;
  materiaIds: string[]; // matérias vinculadas via AgendaAulaMateria — vazio = "todas as matérias"
};

const selectCandidata = {
  id: true, horaInicio: true, horaFim: true, status: true, materiaId: true,
  materia: { select: { nome: true, cor: true } },
  materias: { select: { materiaId: true } },
} as const;

function normalizarCandidata(raw: {
  id: string; horaInicio: string | null; horaFim: string | null; status: string;
  materiaId: string | null; materia: { nome: string; cor: string } | null;
  materias: { materiaId: string }[];
}): AulaCandidata {
  const { materias, ...resto } = raw;
  return { ...resto, materiaIds: materias.map((m) => m.materiaId) };
}

// Conjunto vazio (de qualquer lado) = "todas as matérias", compatível com tudo.
// Senão, precisa ter ao menos 1 matéria em comum.
export function materiasCompativeis(aId: string[], bId: string[] | undefined | null): boolean {
  if (aId.length === 0 || !bId || bId.length === 0) return true;
  return aId.some((id) => bId.includes(id));
}

// Busca a Aula Agendada vinculada a um conteúdo.
// Prioriza o vínculo exato (aulaId) — só cai para a busca por aluno+data
// (ambígua quando o aluno tem mais de uma aula no mesmo dia, ou quando o
// conteúdo nem representa uma aula específica) para conteúdos antigos ou
// criados manualmente, sem o vínculo direto.
//
// Retorna `ambigua: true` e a lista de `candidatas` quando há mais de uma
// aula compatível (ex: duas aulas da mesma matéria no mesmo dia) — nesse
// caso NÃO escolhe nenhuma (evita vincular errado); quem chama pode exibir
// as candidatas para o usuário escolher manualmente.
export async function buscarAulaVinculada(params: {
  empresaId: string;
  aulaId?: string | null;
  alunoId: string;
  data: Date;
  materiaIds?: string[];
}): Promise<{ aula: AulaCandidata | null; ambigua: boolean; candidatas: AulaCandidata[] }> {
  if (params.aulaId) {
    const aula = await prisma.agendaAula.findUnique({
      where: { id: params.aulaId, empresaId: params.empresaId },
      select: selectCandidata,
    });
    return { aula: aula ? normalizarCandidata(aula) : null, ambigua: false, candidatas: [] };
  }
  const dY = params.data.getUTCFullYear();
  const dM = params.data.getUTCMonth();
  const dD = params.data.getUTCDate();
  const candidatasRaw = await prisma.agendaAula.findMany({
    where: {
      empresaId: params.empresaId,
      alunoId: params.alunoId,
      data: {
        gte: new Date(Date.UTC(dY, dM, dD)),
        lt:  new Date(Date.UTC(dY, dM, dD + 1)),
      },
    },
    select: selectCandidata,
  });
  const candidatas = candidatasRaw.map(normalizarCandidata);
  // Sem vínculo direto: só considera match se sobrar exatamente uma aula
  // compatível com as matérias do conteúdo (matéria diferente = não é a
  // mesma aula, mesmo que seja a única do dia — evita juntar conteúdo de
  // uma matéria com a aula de outra matéria no mesmo dia).
  const compativeis = candidatas.filter((a) => materiasCompativeis(a.materiaIds, params.materiaIds));
  if (compativeis.length === 1) return { aula: compativeis[0], ambigua: false, candidatas: [] };
  return { aula: null, ambigua: compativeis.length > 1, candidatas: compativeis };
}

// Validação de agenda para criar/editar conteúdo:
// Planejado  → agenda deve estar com status AGENDADA
// Ministrado → agenda deve estar com status REALIZADA
export async function validarAgenda(
  empresaId: string,
  alunoId:   string,
  data:      Date,
  planejado: boolean,
  aulaId?:   string | null,
  materiaIds?: string[],
): Promise<{ ok: true } | { ok: false; erro: string; candidatas?: AulaCandidata[] }> {
  const { aula, ambigua, candidatas } = await buscarAulaVinculada({ empresaId, aulaId, alunoId, data, materiaIds });

  if (!aula) {
    return {
      ok: false,
      erro: ambigua
        ? "Este aluno tem mais de uma Aula Agendada nesta data/matéria — escolha qual delas vincular."
        : "Não existe Aula Agendada para este aluno nesta data.",
      candidatas: ambigua ? candidatas : undefined,
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

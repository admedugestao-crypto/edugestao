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

export type AulaMinistradaResultado =
  | { ok: true; aula: AulaCandidata }
  | { ok: false; erro: string; candidatas?: AulaCandidata[] };

// Localiza e valida a Aula Agendada por trás de um conteúdo Ministrado —
// usado tanto ao criar um conteúdo já como Ministrado (avulso, sem vir da
// tela de Agenda) quanto ao converter um Planejado existente pra Ministrado.
// Nos dois casos a regra é a mesma: tem que existir uma Aula Agendada
// compatível (não Cancelada, não Falta do Professor, ainda sem outro
// conteúdo vinculado) e o horário dela já precisa ter passado — não dá pra
// "ministrar" uma aula que ainda não aconteceu. Diferente de validarAgenda
// (que só confirma o status), esta função RETORNA a aula encontrada, pra
// quem chama vincular o aulaId e marcar a agenda como Realizada.
export async function validarAulaParaMinistrado(params: {
  empresaId: string;
  alunoId: string;
  data: Date;
  materiaIds?: string[];
  aulaId?: string | null;
  conteudoIdExcluir?: string;
}): Promise<AulaMinistradaResultado> {
  const { aula, ambigua, candidatas } = await buscarAulaVinculada({
    empresaId: params.empresaId,
    aulaId: params.aulaId,
    alunoId: params.alunoId,
    data: params.data,
    materiaIds: params.materiaIds,
  });

  if (!aula) {
    return {
      ok: false,
      erro: ambigua
        ? "Este aluno tem mais de uma Aula Agendada nesta data/matéria — escolha qual delas vincular."
        : "Nenhuma Aula Agendada encontrada para este aluno nesta data.",
      candidatas: ambigua ? candidatas : undefined,
    };
  }

  if (!materiasCompativeis(aula.materiaIds, params.materiaIds)) {
    return {
      ok: false,
      erro: `A matéria do conteúdo não corresponde à matéria da Aula Agendada (${aula.materia?.nome ?? "—"}).`,
    };
  }

  // Bloqueia se ainda não passou o horário de término da aula (fuso UTC-3 Brasil)
  const dY = params.data.getUTCFullYear();
  const dM = params.data.getUTCMonth();
  const dD = params.data.getUTCDate();
  if (aula.horaFim) {
    const [hh, mm] = aula.horaFim.split(":").map(Number);
    // horaFim é horário local (UTC-3), converte para UTC somando 3h
    const fimUTC = new Date(Date.UTC(dY, dM, dD, hh + 3, mm));
    if (new Date() < fimUTC) {
      return { ok: false, erro: `Não é possível marcar como Ministrado antes do término da Aula Agendada (${aula.horaFim}).` };
    }
  } else {
    // Sem horário definido: bloqueia se a data ainda não passou
    const hojeUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1));
    if (params.data >= hojeUTC) {
      return { ok: false, erro: "Não é possível marcar como Ministrado: a Aula Agendada ainda não ocorreu." };
    }
  }

  if (aula.status === "CANCELADA") {
    return { ok: false, erro: "Não é possível marcar como Ministrado: a Aula Agendada está Cancelada." };
  }
  if (aula.status === "FALTA_PROFESSOR") {
    return { ok: false, erro: "Não é possível marcar como Ministrado: a Aula Agendada está registrada como Falta do Professor." };
  }

  // Essa Aula Agendada já tem outro conteúdo vinculado (ex: dois conteúdos
  // criados para o mesmo aluno/matéria/dia) — não deixa vincular de novo.
  const outroVinculado = await prisma.conteudo.findUnique({ where: { aulaId: aula.id }, select: { id: true, topico: true } });
  if (outroVinculado && outroVinculado.id !== params.conteudoIdExcluir) {
    return { ok: false, erro: `Esta Aula Agendada já está vinculada a outro conteúdo ("${outroVinculado.topico}").` };
  }

  return { ok: true, aula };
}

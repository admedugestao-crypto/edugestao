import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type ConflitoDet = {
  alunoNome:           string;
  data:                string; // "YYYY-MM-DD"
  horaInicio:          string; // horário tentado
  horaFim:             string;
  conflitoCom:         string; // aluno que ocupa o horário
  conflitoHoraInicio:  string;
  conflitoHoraFim:     string;
};

export type SemAgendaDet = {
  alunoNome: string;
  motivo:    string; // o que está faltando no cadastro
};

export type ForaDisponibilidadeDet = {
  alunoNome:   string;
  data:        string; // "YYYY-MM-DD"
  diaSemana:   string;
  horaInicio:  string;
  horaFim:     string;
  motivo:      string; // descrição do problema de disponibilidade
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const professoraId = (session.user as any)?.professoraId as string | null;
  const perfil       = (session.user as any)?.perfil as string;

  const body = await req.json() as { semanaInicio: string; professoraId?: string };
  const { semanaInicio } = body;
  const professoraIdBody = body.professoraId ?? null; // Admin pode passar professoraId específica
  if (!semanaInicio) return NextResponse.json({ erro: "semanaInicio é obrigatório" }, { status: 400 });

  const [ay, am, ad] = semanaInicio.split("-").map(Number);
  const baseSemana = new Date(ay, am - 1, ad, 0, 0, 0, 0);

  const agora  = new Date();                          // data+hora exata da geração (UTC no servidor)
  // Converte para horário de Brasília (UTC-3) para comparar com horaInicio das aulas
  const agoraBrasil = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const hoje   = new Date(agora); hoje.setHours(0, 0, 0, 0);
  // Gera a partir de hoje; para o dia atual verifica hora (veja cheque abaixo)
  const inicio = baseSemana >= hoje ? baseSemana : hoje;

  // Hora atual em horário de Brasília — usada para descartar aulas de hoje cujo
  // horário de início já passou no momento da geração
  const horaAgora = `${String(agoraBrasil.getUTCHours()).padStart(2, "0")}:${String(agoraBrasil.getUTCMinutes()).padStart(2, "0")}`;

  const anoCorrente = hoje.getFullYear();
  const fimAnoInt   = anoCorrente * 10000 + 1231;

  function toInt(d: Date) {
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  if (toInt(inicio) > fimAnoInt)
    return NextResponse.json({ criadas: 0, ignoradas: 0, conflitos: [], semAgenda: [] });

  const whereBase: any = { status: "ATIVO" };
  if (perfil === "SUPERADMIN") {
    // Admin pode filtrar por professora específica ou gerar para todas
    if (professoraIdBody) whereBase.professoraId = professoraIdBody;
  } else if (professoraId) {
    whereBase.professoraId = professoraId;
  } else {
    return NextResponse.json({ erro: "Sem permissão para gerar agenda." }, { status: 403 });
  }


  // Todos os alunos ativos (com ou sem agenda)
  const todosAlunos = await prisma.aluno.findMany({
    where: whereBase,
    select: {
      id: true, nome: true, professoraId: true,
      diaSemana: true, horaAula: true, agendaSemanal: true,
      dataInicioContrato: true, dataFimContrato: true,
      materias: { select: { materiaId: true } },
    },
  });

  // Separa quem tem agenda
  type AgendaEntry = { diaSemana: number; horaAula: string };
  function getEntradas(a: typeof todosAlunos[0]): AgendaEntry[] {
    const saved = a.agendaSemanal as any;
    if (Array.isArray(saved) && saved.length > 0) return saved;
    if (a.diaSemana != null && a.horaAula) return [{ diaSemana: a.diaSemana, horaAula: a.horaAula }];
    return [];
  }

  const alunos     = todosAlunos.filter((a) => getEntradas(a).length > 0);
  const semAgenda  = todosAlunos.filter((a) => getEntradas(a).length === 0);

  const semAgendaLista: SemAgendaDet[] = semAgenda.map((a) => ({
    alunoNome: a.nome,
    motivo: "Sem horário fixo de aula cadastrado",
  }));

  // Busca disponibilidade de todos os professores envolvidos
  const profIds = [...new Set(alunos.map((a) => a.professoraId).filter(Boolean))] as string[];
  const professoras = profIds.length > 0
    ? await prisma.professora.findMany({
        where: { id: { in: profIds } },
        select: { id: true, disponibilidade: true },
      })
    : [];
  const dispMap = new Map(
    professoras.map((p) => [p.id, (p.disponibilidade as any[]) ?? []])
  );

  const DIAS_SEMANA = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  function toMin(h: string) { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; }

  let criadas   = 0;
  let ignoradas = 0;
  const conflitosLista: ConflitoDet[] = [];
  const foraDispLista: ForaDisponibilidadeDet[] = [];

  for (const aluno of alunos) {
    const profId = perfil === "SUPERADMIN"
      ? aluno.professoraId
      : (professoraId ?? aluno.professoraId);
    if (!profId) continue;

    // Período contratual
    let inicioAluno = new Date(inicio);
    if (aluno.dataInicioContrato) {
      const ci = new Date(aluno.dataInicioContrato); ci.setHours(0,0,0,0);
      if (ci > inicioAluno) inicioAluno = ci;
    }
    let fimAluno = fimAnoInt;
    if (aluno.dataFimContrato) {
      const cf = new Date(aluno.dataFimContrato); cf.setHours(0,0,0,0);
      const cfInt = toInt(cf);
      if (cfInt < fimAluno) fimAluno = cfInt;
    }
    if (toInt(inicioAluno) > fimAluno) continue;

    // Itera sobre cada entrada da agenda semanal
    for (const entrada of getEntradas(aluno)) {
      const diaSemanaEntrada = entrada.diaSemana;
      const horaInicio       = entrada.horaAula;
      const [h, m]           = horaInicio.split(":").map(Number);
      const horaFim          = `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      let dataAula = new Date(inicioAluno);
      while (dataAula.getDay() !== diaSemanaEntrada) {
        dataAula.setDate(dataAula.getDate() + 1);
      }

      while (toInt(dataAula) <= fimAluno) {
        const dY = dataAula.getFullYear();
        const dM = dataAula.getMonth();
        const dD = dataAula.getDate();

        const dataUTC  = new Date(Date.UTC(dY, dM, dD));
        const rangeGte = new Date(Date.UTC(dY, dM, dD));
        const rangeLt  = new Date(Date.UTC(dY, dM, dD + 1));

        // Para o dia atual, pula se o horário já passou
        const ehHoje = toInt(dataAula) === toInt(hoje);
        if (ehHoje && horaInicio <= horaAgora) {
          ignoradas++;
          dataAula.setDate(dataAula.getDate() + 7);
          continue;
        }

        const aulasNoDia = await prisma.agendaAula.findMany({
          where: { professoraId: profId!, data: { gte: rangeGte, lt: rangeLt } },
          select: { id: true, alunoId: true, horaInicio: true, horaFim: true, status: true, materiaId: true, aluno: { select: { nome: true } } },
        });

        // Conflito real de horário: outro aluno ocupando o mesmo professor neste intervalo
        const aulaConflitante = aulasNoDia.find(
          (a) => a.alunoId !== aluno.id && a.status !== "CANCELADA" && a.horaInicio && a.horaFim &&
                 horaInicio < a.horaFim && horaFim > a.horaInicio,
        );

        if (aulaConflitante) {
          conflitosLista.push({
            alunoNome: aluno.nome, data: dataUTC.toISOString().split("T")[0],
            horaInicio, horaFim,
            conflitoCom: aulaConflitante.aluno.nome,
            conflitoHoraInicio: aulaConflitante.horaInicio!,
            conflitoHoraFim:    aulaConflitante.horaFim!,
          });
          dataAula.setDate(dataAula.getDate() + 7);
          continue;
        }

        // Já existe aula deste aluno neste dia neste horário — sincroniza N:N de matérias
        const aulaExistente = aulasNoDia.find((a) => a.alunoId === aluno.id && a.horaInicio === horaInicio);
        if (aulaExistente) {
          const materiaIds = aluno.materias.map((m) => m.materiaId);
          if (materiaIds.length > 0) {
            await prisma.agendaAulaMateria.deleteMany({ where: { agendaAulaId: aulaExistente.id } });
            await prisma.agendaAulaMateria.createMany({
              data: materiaIds.map((mid) => ({ agendaAulaId: aulaExistente.id, materiaId: mid })),
              skipDuplicates: true,
            });
            await prisma.agendaAula.update({
              where: { id: aulaExistente.id },
              data: { materiaId: materiaIds[0] },
            });
          }
          ignoradas++;
          dataAula.setDate(dataAula.getDate() + 7);
          continue;
        }

        // Verificar disponibilidade do professor
        const slots = dispMap.get(profId!) ?? [];
        const nomeDia = DIAS_SEMANA[dataAula.getDay()];
        if (slots.length > 0) {
          const slotsDia = slots.filter((s: any) => s.dia === nomeDia);
          if (slotsDia.length === 0) {
            foraDispLista.push({
              alunoNome: aluno.nome,
              data: dataUTC.toISOString().split("T")[0],
              diaSemana: nomeDia, horaInicio, horaFim,
              motivo: `Professor(a) não tem disponibilidade para ${nomeDia}`,
            });
          } else {
            const inicioMin = toMin(horaInicio);
            const fimMin    = toMin(horaFim);
            const dentro = slotsDia.some((s: any) => inicioMin >= toMin(s.inicio) && fimMin <= toMin(s.fim));
            if (!dentro) {
              const faixas = slotsDia.map((s: any) => `${s.inicio}–${s.fim}`).join(", ");
              foraDispLista.push({
                alunoNome: aluno.nome,
                data: dataUTC.toISOString().split("T")[0],
                diaSemana: nomeDia, horaInicio, horaFim,
                motivo: `Horário ${horaInicio}–${horaFim} fora da disponibilidade de ${nomeDia} (${faixas})`,
              });
            }
          }
        }

        // Uma única aula, vinculada a todas as matérias parametrizadas no cadastro do aluno
        const materiaIds = aluno.materias.map((m) => m.materiaId);
        await prisma.agendaAula.create({
          data: {
            professoraId: profId!, alunoId: aluno.id,
            materiaId: materiaIds[0] ?? null,
            data: dataUTC, horaInicio, horaFim, status: "AGENDADA",
            materias: materiaIds.length > 0
              ? { create: materiaIds.map((materiaId) => ({ materiaId })) }
              : undefined,
          },
        });
        criadas++;

        dataAula.setDate(dataAula.getDate() + 7);
      }
    }
  }

  return NextResponse.json({ criadas, ignoradas, conflitos: conflitosLista, semAgenda: semAgendaLista, foraDisponibilidade: foraDispLista });
}

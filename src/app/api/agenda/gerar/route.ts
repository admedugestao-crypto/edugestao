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

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const inicio = baseSemana >= hoje ? baseSemana : hoje;

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

  // Alunos COM parâmetros de agenda → gerar aulas
  const alunos = await prisma.aluno.findMany({
    where: { ...whereBase, diaSemana: { not: null }, horaAula: { not: null } },
    select: {
      id: true, nome: true, professoraId: true, diaSemana: true, horaAula: true,
      dataInicioContrato: true, dataFimContrato: true,
      materias: { select: { materiaId: true } },
    },
  });

  // Alunos SEM parâmetros de agenda → listar no relatório
  const alunosSemAgenda = await prisma.aluno.findMany({
    where: {
      ...whereBase,
      OR: [{ diaSemana: null }, { horaAula: null }],
    },
    select: { nome: true, diaSemana: true, horaAula: true, dataFimContrato: true },
  });

  const semAgendaLista: SemAgendaDet[] = alunosSemAgenda.map((a) => {
    const faltaDia     = a.diaSemana === null;
    const faltaHorario = a.horaAula  === null;
    const motivo =
      faltaDia && faltaHorario ? "Sem dia fixo e sem horário de aula"
      : faltaDia               ? "Sem dia fixo de aula"
      :                          "Sem horário de aula";
    return { alunoNome: a.nome, motivo };
  });

  let criadas   = 0;
  let ignoradas = 0;
  const conflitosLista: ConflitoDet[] = [];

  for (const aluno of alunos) {
    const profId = professoraId ?? aluno.professoraId;
    if (!profId) continue; // aluno sem professor não gera agenda

    const diaSemanaAluno = aluno.diaSemana!;
    const materiaId      = aluno.materias[0]?.materiaId ?? null;

    const horaInicio: string | null = aluno.horaAula ?? null;
    let   horaFim:    string | null = null;
    if (horaInicio) {
      const [h, m] = horaInicio.split(":").map(Number);
      horaFim = `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    // Respeita o período contratual do aluno
    // Início: o mais tardio entre (inicio da semana selecionada) e (dataInicioContrato)
    let inicioAluno = new Date(inicio);
    if (aluno.dataInicioContrato) {
      const contratoInicio = new Date(aluno.dataInicioContrato);
      contratoInicio.setHours(0, 0, 0, 0);
      if (contratoInicio > inicioAluno) inicioAluno = contratoInicio;
    }

    // Fim: o mais cedo entre (fim do ano) e (dataFimContrato)
    let fimAluno = fimAnoInt;
    if (aluno.dataFimContrato) {
      const contratoFim = new Date(aluno.dataFimContrato);
      contratoFim.setHours(0, 0, 0, 0);
      const contratoFimInt = toInt(contratoFim);
      if (contratoFimInt < fimAluno) fimAluno = contratoFimInt;
    }

    // Se o período contratual já encerrou antes do início, pula o aluno
    if (toInt(inicioAluno) > fimAluno) continue;

    let dataAula = new Date(inicioAluno);
    while (dataAula.getDay() !== diaSemanaAluno) {
      dataAula.setDate(dataAula.getDate() + 1);
    }

    while (toInt(dataAula) <= fimAluno) {
      const dY = dataAula.getFullYear();
      const dM = dataAula.getMonth();
      const dD = dataAula.getDate();

      const dataUTC  = new Date(Date.UTC(dY, dM, dD));
      const rangeGte = new Date(Date.UTC(dY, dM, dD));
      const rangeLt  = new Date(Date.UTC(dY, dM, dD + 1));

      const aulasNoDia = await prisma.agendaAula.findMany({
        where: {
          professoraId: profId!,
          data: { gte: rangeGte, lt: rangeLt },
        },
        select: {
          alunoId:    true,
          horaInicio: true,
          horaFim:    true,
          status:     true,
          aluno:      { select: { nome: true } },
        },
      });

      const jaExiste = aulasNoDia.some((a) => a.alunoId === aluno.id);

      if (jaExiste) {
        ignoradas++;
      } else if (horaInicio && horaFim) {
        const aulaConflitante = aulasNoDia.find(
          (a) => a.status !== "CANCELADA" &&
                 a.horaInicio && a.horaFim &&
                 horaInicio < a.horaFim &&
                 horaFim    > a.horaInicio,
        );

        if (aulaConflitante) {
          conflitosLista.push({
            alunoNome:          aluno.nome,
            data:               dataUTC.toISOString().split("T")[0],
            horaInicio,
            horaFim,
            conflitoCom:        aulaConflitante.aluno.nome,
            conflitoHoraInicio: aulaConflitante.horaInicio!,
            conflitoHoraFim:    aulaConflitante.horaFim!,
          });
        } else {
          await prisma.agendaAula.create({
            data: {
              professoraId: profId!,
              alunoId:      aluno.id,
              materiaId,
              data:         dataUTC,
              horaInicio,
              horaFim,
              status:       "AGENDADA",
            },
          });
          criadas++;
        }
      } else {
        await prisma.agendaAula.create({
          data: {
            professoraId: profId!,
            alunoId:      aluno.id,
            materiaId,
            data:         dataUTC,
            horaInicio,
            horaFim,
            status:       "AGENDADA",
          },
        });
        criadas++;
      }

      dataAula.setDate(dataAula.getDate() + 7);
    }
  }

  return NextResponse.json({ criadas, ignoradas, conflitos: conflitosLista, semAgenda: semAgendaLista });
}

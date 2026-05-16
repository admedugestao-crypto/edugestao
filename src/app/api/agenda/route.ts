import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Helper ─────────────────────────────────────────────────────────────────────
// Converte "YYYY-MM-DD" em UTC midnight.
// new Date("YYYY-MM-DD") já faz isso nativamente (ISO date-only = UTC midnight).
// Usar sempre esta função garante que gravação e consulta usam a mesma referência.
function utcDia(str: string): Date {
  return new Date(str); // "2026-05-20" → 2026-05-20T00:00:00.000Z
}
function utcDiaNum(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d)); // mês 0-indexado
}

// GET /api/agenda?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const professoraId = (session.user as any)?.professoraId as string | null;
  const perfil       = (session.user as any)?.perfil as string;

  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get("inicio");
  const fim    = searchParams.get("fim");

  if (!inicio || !fim)
    return NextResponse.json({ erro: "Parâmetros inicio e fim são obrigatórios" }, { status: 400 });

  // Range: UTC midnight do dia início até UTC midnight do dia seguinte ao fim
  const [fy, fm, fd] = fim.split("-").map(Number);
  const dataInicio = utcDia(inicio);
  const dataFim    = utcDiaNum(fy, fm - 1, fd + 1); // exclusive: < próximo dia

  const where: any = { data: { gte: dataInicio, lt: dataFim } };
  if (perfil !== "SUPERADMIN" && professoraId) where.professoraId = professoraId;

  const aulas = await prisma.agendaAula.findMany({
    where,
    include: {
      aluno:      { select: { id: true, nome: true, serie: true, turma: true } },
      materia:    { select: { id: true, nome: true, cor: true } },
      professora: { select: { usuario: { select: { nome: true } } } },
    },
    orderBy: [{ data: "asc" }, { horaInicio: "asc" }],
  });

  return NextResponse.json(aulas);
}

// DELETE /api/agenda  — excluir aulas em lote por aluno + período
// Body: { alunoId, inicio?: "YYYY-MM-DD", fim?: "YYYY-MM-DD" }
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const sessProfId = (session.user as any)?.professoraId as string | null;
  const perfil     = (session.user as any)?.perfil as string;

  const { alunoId, inicio, fim } = await req.json() as {
    alunoId?: string; inicio?: string; fim?: string;
  };

  if (!alunoId)
    return NextResponse.json({ erro: "alunoId é obrigatório" }, { status: 400 });

  const where: any = { alunoId };

  if (sessProfId) {
    where.professoraId = sessProfId;
  } else if (perfil !== "SUPERADMIN") {
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });
  }

  if (inicio || fim) {
    where.data = {};
    if (inicio) where.data.gte = utcDia(inicio);
    if (fim) {
      const [y, m, d] = fim.split("-").map(Number);
      where.data.lt = utcDiaNum(y, m - 1, d + 1); // exclusive upper bound
    }
  }

  const { count } = await prisma.agendaAula.deleteMany({ where });
  return NextResponse.json({ excluidas: count });
}

// POST /api/agenda  — criar aula avulsa
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const sessProfId = (session.user as any)?.professoraId as string | null;
  const perfil     = (session.user as any)?.perfil as string;

  const body = await req.json();
  const { alunoId, materiaId, data, horaInicio, horaFim, observacao, professoraId: bodyProfId } = body;

  const professoraId = sessProfId ?? (perfil !== "PROFESSORA" ? bodyProfId : null);

  if (!professoraId)
    return NextResponse.json({ erro: "professoraId é obrigatório" }, { status: 403 });

  if (!alunoId || !data)
    return NextResponse.json({ erro: "alunoId e data são obrigatórios" }, { status: 400 });

  // Grava como UTC midnight — padrão único em todo o sistema
  const dataObj = utcDia(data as string); // "YYYY-MM-DD" → T00:00:00Z

  // Range UTC que cobre TODOS os registros deste dia (independente de como foram gravados)
  const [dy, dm, dd] = (data as string).split("-").map(Number);
  const rangeGte = utcDiaNum(dy, dm - 1, dd);
  const rangeLt  = utcDiaNum(dy, dm - 1, dd + 1);

  // ── Verificação de conflito de horário ────────────────────────────────────
  if (horaInicio && horaFim) {
    const aulasNoDia = await prisma.agendaAula.findMany({
      where: {
        professoraId,
        data:   { gte: rangeGte, lt: rangeLt },
        status: { not: "CANCELADA" },
      },
      select: {
        horaInicio: true,
        horaFim:    true,
        aluno:      { select: { nome: true } },
      },
    });

    // Sobreposição: novoInicio < fimExistente  E  novoFim > inicioExistente
    const conflito = aulasNoDia.find(
      (a) => a.horaInicio && a.horaFim &&
             (horaInicio as string) < a.horaFim &&
             (horaFim    as string) > a.horaInicio,
    );

    if (conflito) {
      return NextResponse.json(
        { erro: `Conflito: já existe aula de ${(conflito as any).aluno.nome} das ${conflito.horaInicio} às ${conflito.horaFim}.` },
        { status: 409 },
      );
    }
  }

  const aula = await prisma.agendaAula.create({
    data: {
      professoraId,
      alunoId,
      materiaId:  materiaId  || null,
      data:       dataObj,
      horaInicio: horaInicio || null,
      horaFim:    horaFim    || null,
      observacao: observacao || null,
    },
    include: {
      aluno:   { select: { id: true, nome: true, serie: true, turma: true } },
      materia: { select: { id: true, nome: true, cor: true } },
    },
  });

  return NextResponse.json(aula, { status: 201 });
}

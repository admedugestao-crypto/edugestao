import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

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
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const inicio          = searchParams.get("inicio");
  const fim             = searchParams.get("fim");
  const filtroProfId    = searchParams.get("professoraId"); // filtro opcional para admin

  if (!inicio || !fim)
    return NextResponse.json({ erro: "Parâmetros inicio e fim são obrigatórios" }, { status: 400 });

  // Range: UTC midnight do dia início até UTC midnight do dia seguinte ao fim
  const [fy, fm, fd] = fim.split("-").map(Number);
  const dataInicio = utcDia(inicio);
  const dataFim    = utcDiaNum(fy, fm - 1, fd + 1); // exclusive: < próximo dia

  const where: any = { empresaId: scope.empresaId, data: { gte: dataInicio, lt: dataFim } };
  if (scope.isAdmin) {
    // Admin pode filtrar por professora específica via query param
    if (filtroProfId) where.professoraId = filtroProfId;
  } else if (scope.professoraId) {
    where.professoraId = scope.professoraId;
  }

  const aulas = await prisma.agendaAula.findMany({
    where,
    include: {
      aluno: {
        select: {
          id: true, nome: true, serie: true, turma: true,
          materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
        },
      },
      materia:    { select: { id: true, nome: true, cor: true } },
      materias:   { select: { materia: { select: { id: true, nome: true, cor: true } } } },
      professora: { select: { usuario: { select: { nome: true } } } },
      // Vínculo exato — evita mostrar o conteúdo de outra aula do mesmo
      // aluno no mesmo dia, quando há mais de uma.
      conteudo: { select: { planejado: true, topico: true, descricao: true, arquivoUrl: true } },
    },
    orderBy: [{ data: "asc" }, { horaInicio: "asc" }],
  });

  const aulasComConteudo = aulas.map(({ conteudo, ...a }) => ({ ...a, conteudo: conteudo ?? null }));

  return NextResponse.json(aulasComConteudo);
}

// DELETE /api/agenda  — excluir aulas em lote por aluno + período
// Body: { alunoId, inicio?: "YYYY-MM-DD", fim?: "YYYY-MM-DD" }
export async function DELETE(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { alunoId, inicio, fim, professoraId: bodyProfId } = await req.json() as {
    alunoId?: string; inicio?: string; fim?: string; professoraId?: string;
  };

  // Admin pode excluir sem filtrar por aluno; professora exige alunoId
  if (!scope.isAdmin && !alunoId)
    return NextResponse.json({ erro: "alunoId é obrigatório" }, { status: 400 });

  if (!scope.isAdmin && !scope.professoraId)
    return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const where: any = { empresaId: scope.empresaId };
  if (alunoId) where.alunoId = alunoId;

  if (scope.isAdmin) {
    if (bodyProfId) where.professoraId = bodyProfId;
  } else {
    where.professoraId = scope.professoraId;
  }

  if (inicio || fim) {
    where.data = {};
    if (inicio) where.data.gte = utcDia(inicio);
    if (fim) {
      const [y, m, d] = fim.split("-").map(Number);
      where.data.lt = utcDiaNum(y, m - 1, d + 1); // exclusive upper bound
    }
  }

  // Busca IDs das aulas que seriam excluídas
  const aulasParaExcluir = await prisma.agendaAula.findMany({ where, select: { id: true } });
  const ids = aulasParaExcluir.map((a) => a.id);

  let idsVinculados: string[] = [];
  if (ids.length > 0) {
    // Verifica via SQL raw quais têm pagamento vinculado, para preservá-las
    const vinculos = await prisma.$queryRaw<{ agendaAulaId: string }[]>`
      SELECT DISTINCT "agendaAulaId" FROM pagamento_aulas
      WHERE "agendaAulaId" = ANY(${ids}::text[])
    `;
    idsVinculados = vinculos.map((v) => v.agendaAulaId);
  }

  const idsExcluiveis = ids.filter((id) => !idsVinculados.includes(id));
  const { count } = idsExcluiveis.length > 0
    ? await prisma.agendaAula.deleteMany({ where: { id: { in: idsExcluiveis } } })
    : { count: 0 };

  return NextResponse.json({
    excluidas: count,
    preservadas: idsVinculados.length,
    avisoPagamento: idsVinculados.length > 0
      ? `${idsVinculados.length} aula(s) vinculada(s) a pagamentos foram preservadas e não foram excluídas.`
      : null,
  });
}

// POST /api/agenda  — criar aula avulsa
export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { alunoId, materiaId, data, horaInicio, horaFim, observacao, professoraId: bodyProfId } = body;

  // Admin escolhe o professor no modal → usa bodyProfId; professora usa sua própria sessão
  const professoraId = scope.isAdmin ? (bodyProfId ?? null) : (scope.professoraId ?? null);

  if (!professoraId)
    return NextResponse.json({ erro: "professoraId é obrigatório" }, { status: 403 });

  if (!alunoId || !data)
    return NextResponse.json({ erro: "alunoId e data são obrigatórios" }, { status: 400 });

  if (!horaInicio || !horaFim)
    return NextResponse.json({ erro: "Início e fim são obrigatórios" }, { status: 400 });

  // Confere que aluno e (quando escolhida pelo admin) professora pertencem à
  // mesma empresa da sessão — evita vincular uma aula a um registro de outra
  // empresa via id adivinhado/manipulado no corpo da requisição.
  const [alunoOk, professoraOk] = await Promise.all([
    prisma.aluno.findFirst({ where: { id: alunoId, empresaId: scope.empresaId }, select: { id: true } }),
    prisma.professora.findFirst({ where: { id: professoraId, empresaId: scope.empresaId }, select: { id: true } }),
  ]);
  if (!alunoOk || !professoraOk) {
    return NextResponse.json({ erro: "Aluno ou professora não encontrados." }, { status: 404 });
  }

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
      empresaId: scope.empresaId,
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

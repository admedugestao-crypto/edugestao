import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/agenda/realizadas?alunoId=xxx
// Retorna aulas REALIZADA do aluno que ainda não têm pagamento vinculado
export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const alunoId = new URL(req.url).searchParams.get("alunoId");
  if (!alunoId) return NextResponse.json({ erro: "alunoId obrigatório" }, { status: 400 });

  const aulas = await prisma.agendaAula.findMany({
    where: {
      empresaId: scope.empresaId,
      alunoId,
      status: "REALIZADA",
      pagamentos: { none: {} },
    },
    select: {
      id:         true,
      data:       true,
      horaInicio: true,
      horaFim:    true,
      materia:    { select: { nome: true } },
    },
    orderBy: { data: "desc" },
  });

  return NextResponse.json(
    aulas.map((a) => ({
      id:         a.id,
      data:       a.data.toISOString(),
      horaInicio: a.horaInicio,
      horaFim:    a.horaFim,
      materia:    a.materia?.nome ?? null,
    })),
  );
}

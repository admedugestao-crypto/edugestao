import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Retorna as disciplinas já usadas por alunos da mesma unidade e série.
// Isso dá contexto ao cadastro sem restringir as disciplinas disponíveis.
export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unidadeId = searchParams.get("unidadeId");
  const serie = searchParams.get("serie");
  if (!unidadeId || !serie) return NextResponse.json({ materiaIds: [] });

  const unidade = await prisma.unidade.findFirst({
    where: { id: unidadeId, empresaId: scope.empresaId },
    select: { id: true },
  });
  if (!unidade) return NextResponse.json({ materiaIds: [] });

  const registros = await prisma.alunoMateria.findMany({
    where: {
      aluno: {
        empresaId: scope.empresaId,
        unidadeId,
        serie,
        status: "ATIVO",
        ...(!scope.isAdmin ? { professoraId: scope.professoraId ?? "__sem_professora__" } : {}),
      },
    },
    select: { materiaId: true },
    distinct: ["materiaId"],
  });

  return NextResponse.json({ materiaIds: registros.map((registro) => registro.materiaId) });
}

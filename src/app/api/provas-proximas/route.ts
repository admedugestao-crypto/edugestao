import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/provas-proximas?professoraId=X
// Provas nos próximos 30 dias, nas turmas (unidade+série) dos alunos ativos da professora.
export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filtroProfId = searchParams.get("professoraId");

  let professoraId: string | null = null;
  if (scope.isAdmin) {
    professoraId = filtroProfId;
  } else if (scope.professoraId) {
    professoraId = scope.professoraId;
  }
  if (!professoraId) return NextResponse.json([]);

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const em30dias = new Date(hoje); em30dias.setDate(em30dias.getDate() + 30); em30dias.setHours(23, 59, 59, 999);

  const alunosProf = await prisma.aluno.findMany({
    where: { professoraId, empresaId: scope.empresaId, status: "ATIVO" },
    select: { unidadeId: true, serie: true },
  });
  const combos = Array.from(new Set(alunosProf.map((a) => `${a.unidadeId}::${a.serie}`)))
    .map((s) => { const [unidadeId, serie] = s.split("::"); return { unidadeId, serie }; });
  if (combos.length === 0) return NextResponse.json([]);

  const avaliacoes = await prisma.avaliacao.findMany({
    where: { empresaId: scope.empresaId, data: { gte: hoje, lte: em30dias }, OR: combos },
    select: {
      id: true, nome: true, data: true, serie: true,
      materia: { select: { nome: true, cor: true } },
      unidade: { select: { nome: true, escola: { select: { nome: true } } } },
    },
    orderBy: { data: "asc" },
  });

  return NextResponse.json(avaliacoes.map((av) => ({
    id: av.id,
    nome: av.nome,
    data: av.data.toISOString(),
    serie: av.serie,
    materiaNome: av.materia?.nome ?? null,
    materiaCor: av.materia?.cor ?? null,
    unidadeNome: av.unidade.nome,
    escolaNome: av.unidade.escola.nome,
  })));
}

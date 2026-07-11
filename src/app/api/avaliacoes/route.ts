import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unidadeId = searchParams.get("unidadeId");
  const serie = searchParams.get("serie");

  const avaliacoes = await prisma.avaliacao.findMany({
    where: {
      empresaId: scope.empresaId,
      ...(unidadeId ? { unidadeId } : {}),
      ...(serie ? { serie } : {}),
    },
    include: { unidade: { include: { escola: true } }, materia: true },
    orderBy: { data: "asc" },
  });
  return NextResponse.json(avaliacoes);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();

  const unidadeOk = await prisma.unidade.findFirst({
    where: { id: body.unidadeId, empresaId: scope.empresaId },
    select: { id: true },
  });
  if (!unidadeOk) return NextResponse.json({ erro: "Unidade não encontrada." }, { status: 404 });

  const avaliacao = await prisma.avaliacao.create({
    data: {
      empresaId: scope.empresaId,
      unidadeId: body.unidadeId,
      materiaId: body.materiaId || null,
      serie: body.serie,
      nome: body.nome,
      data: new Date(body.data),
      peso: body.peso ?? 1.0,
      notaMax: body.notaMax ?? 10.0,
      periodo: body.periodo || null,
    },
    include: { unidade: { include: { escola: true } }, materia: true },
  });
  return NextResponse.json(avaliacao, { status: 201 });
}

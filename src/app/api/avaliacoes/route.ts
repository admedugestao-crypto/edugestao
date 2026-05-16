import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unidadeId = searchParams.get("unidadeId");
  const serie = searchParams.get("serie");

  const avaliacoes = await prisma.avaliacao.findMany({
    where: {
      ...(unidadeId ? { unidadeId } : {}),
      ...(serie ? { serie } : {}),
    },
    include: { unidade: { include: { escola: true } }, materia: true },
    orderBy: { data: "asc" },
  });
  return NextResponse.json(avaliacoes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const avaliacao = await prisma.avaliacao.create({
    data: {
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

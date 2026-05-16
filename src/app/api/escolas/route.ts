import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const escolas = await prisma.escola.findMany({
    include: { unidades: { orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(escolas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const escola = await prisma.escola.create({
    data: { nome: body.nome, rede: body.rede || null, periodoAvaliacao: body.periodoAvaliacao || null },
    include: { unidades: true },
  });
  return NextResponse.json(escola, { status: 201 });
}

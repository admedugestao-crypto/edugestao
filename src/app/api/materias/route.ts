import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const materias = await prisma.materia.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(materias);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const materia = await prisma.materia.create({
    data: { nome: body.nome, cor: body.cor || "#6366f1" },
  });
  return NextResponse.json(materia, { status: 201 });
}

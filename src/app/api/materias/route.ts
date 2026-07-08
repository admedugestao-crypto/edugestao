import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const materias = await prisma.materia.findMany({
    where: { empresaId: scope.empresaId },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(materias);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const materia = await prisma.materia.create({
    data: { empresaId: scope.empresaId, nome: body.nome, cor: body.cor || "#6366f1" },
  });
  return NextResponse.json(materia, { status: 201 });
}

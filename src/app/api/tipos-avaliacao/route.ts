import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const tipos = await prisma.tipoAvaliacao.findMany({
    where: { empresaId: scope.empresaId },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(tipos);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  if (!body.nome || !body.nome.trim()) {
    return NextResponse.json({ erro: "Nome é obrigatório." }, { status: 400 });
  }

  try {
    const tipo = await prisma.tipoAvaliacao.create({
      data: { empresaId: scope.empresaId, nome: body.nome.trim() },
    });
    return NextResponse.json(tipo, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ erro: "Já existe um tipo com esse nome." }, { status: 409 });
    }
    throw err;
  }
}

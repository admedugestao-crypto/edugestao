import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { parseDataLocal } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const escolas = await prisma.escola.findMany({
    where: { empresaId: scope.empresaId },
    include: { unidades: { orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(escolas);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const escola = await prisma.escola.create({
    data: {
      empresaId: scope.empresaId,
      nome: body.nome,
      rede: body.rede || null,
      periodoAvaliacao: body.periodoAvaliacao || null,
      periodoLetivo1Inicio: body.periodoLetivo1Inicio ? parseDataLocal(body.periodoLetivo1Inicio) : null,
      periodoLetivo1Fim: body.periodoLetivo1Fim ? parseDataLocal(body.periodoLetivo1Fim) : null,
      periodoLetivo2Inicio: body.periodoLetivo2Inicio ? parseDataLocal(body.periodoLetivo2Inicio) : null,
      periodoLetivo2Fim: body.periodoLetivo2Fim ? parseDataLocal(body.periodoLetivo2Fim) : null,
    },
    include: { unidades: true },
  });
  return NextResponse.json(escola, { status: 201 });
}

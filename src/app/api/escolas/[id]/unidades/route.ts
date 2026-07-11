import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id: escolaId } = await params;
  const body = await req.json();

  const escola = await prisma.escola.findUnique({ where: { id: escolaId }, select: { empresaId: true } });
  if (!escola || escola.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Escola não encontrada." }, { status: 404 });
  }

  const unidade = await prisma.unidade.create({
    data: {
      empresaId: scope.empresaId,
      escolaId,
      nome: body.nome,
      endereco: body.endereco || null,
      bairro: body.bairro || null,
      cidade: body.cidade || null,
      estado: body.estado || null,
      cep: body.cep || null,
      telefone: body.telefone || null,
      diretor: body.diretor || null,
      turno: body.turno || null,
    },
  });
  return NextResponse.json(unidade, { status: 201 });
}

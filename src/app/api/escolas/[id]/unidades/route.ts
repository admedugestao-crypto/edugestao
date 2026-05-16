import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id: escolaId } = await params;
  const body = await req.json();

  const unidade = await prisma.unidade.create({
    data: {
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

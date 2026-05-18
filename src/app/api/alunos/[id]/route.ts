import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      unidade: { include: { escola: true } },
      materias: { include: { materia: true } },
      professora: { include: { usuario: { select: { nome: true } } } },
    },
  });

  if (!aluno) return NextResponse.json({ erro: "Não encontrado" }, { status: 404 });

  return NextResponse.json(aluno);
}

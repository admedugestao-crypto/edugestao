import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const alunos = await prisma.aluno.findMany({ select: { id: true, nome: true, status: true } });
  const total  = await prisma.aluno.count({ where: { status: "ATIVO" } });
  return NextResponse.json({ alunos, totalAtivo: total });
}

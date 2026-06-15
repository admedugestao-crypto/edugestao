import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Rota temporária para ajuste de dados de teste — REMOVER APÓS USO
export async function GET() {
  const result = await prisma.agendaAula.updateMany({
    where: {
      aluno: { nome: "Laura" },
      data: {
        gte: new Date("2026-06-18T00:00:00Z"),
        lt:  new Date("2026-06-19T00:00:00Z"),
      },
    },
    data: { status: "AGENDADA" },
  });

  return NextResponse.json({ atualizadas: result.count });
}

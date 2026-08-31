import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const desde = new Date(Date.now() - 20 * 1000);
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true, nome: true, slug: true, ativo: true,
      sessoesAtivas: {
        where: { ultimaAtividade: { gte: desde }, usuario: { ativo: true } },
        select: {
          id: true, rota: true, dispositivo: true, ultimaAtividade: true,
          usuario: { select: { id: true, nome: true, email: true, perfil: true, foto: true } },
        },
        orderBy: { ultimaAtividade: "desc" },
      },
    },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json({ atualizadoEm: new Date(), empresas });
}

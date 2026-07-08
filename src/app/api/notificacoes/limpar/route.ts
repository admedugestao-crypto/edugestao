import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const scope = await getSessionScope();
  if (!scope || !scope.isAdmin) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  await prisma.notificacaoProva.deleteMany({ where: { empresaId: scope.empresaId } });
  return NextResponse.json({ ok: true });
}

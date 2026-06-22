import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await auth();
  const perfil = (session?.user as any)?.perfil;
  if (!session || perfil !== "SUPERADMIN") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  await prisma.notificacaoProva.deleteMany({});
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string; empresaId?: string } | undefined;
  if (!user?.id || !user.empresaId) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const sessaoId = typeof body?.sessaoId === "string" ? body.sessaoId.trim() : "";
  const rota = typeof body?.rota === "string" ? body.rota.slice(0, 200) : "";
  const dispositivo = typeof body?.dispositivo === "string" ? body.dispositivo.slice(0, 80) : "Navegador";

  if (!/^[a-zA-Z0-9-]{20,80}$/.test(sessaoId) || !rota.startsWith("/")) {
    return NextResponse.json({ erro: "Dados de presença inválidos." }, { status: 400 });
  }

  const agora = new Date();
  await prisma.$transaction([
    prisma.sessaoAtiva.deleteMany({
      where: { ultimaAtividade: { lt: new Date(agora.getTime() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.sessaoAtiva.upsert({
      where: { id_usuarioId: { id: sessaoId, usuarioId: user.id } },
      create: { id: sessaoId, usuarioId: user.id, empresaId: user.empresaId, rota, dispositivo, ultimaAtividade: agora },
      update: { empresaId: user.empresaId, rota, dispositivo, ultimaAtividade: agora },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

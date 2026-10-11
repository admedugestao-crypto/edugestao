import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { moduloDaRota } from "@/lib/modulosAcesso";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope || scope.perfil === "PLATAFORMA") return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ erro: "Origem inválida" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const modulo = typeof body?.rota === "string" && body.rota.length <= 300 ? moduloDaRota(body.rota) : null;
  if (!modulo || typeof body?.eventoId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.eventoId)) {
    return NextResponse.json({ erro: "Acesso inválido" }, { status: 400 });
  }
  const usuario = await prisma.usuario.findFirst({
    where: { id: scope.userId, empresaId: scope.empresaId, ativo: true, empresa: { ativo: true } }, select: { id: true },
  });
  if (!usuario) return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  await prisma.acessoApp.upsert({
    where: { id: body.eventoId }, update: {},
    create: { id: body.eventoId, empresaId: scope.empresaId, usuarioId: scope.userId,
      modulo, canal: body.rota.startsWith("/m") ? "MOBILE" : "WEB" },
  });
  return new NextResponse(null, { status: 204 });
}

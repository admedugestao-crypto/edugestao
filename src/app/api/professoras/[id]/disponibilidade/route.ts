import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

import { validarDisponibilidade } from "@/lib/validarDisponibilidade";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  if (!scope.isAdmin) return NextResponse.json({ erro: "Apenas administradores podem alterar disponibilidades." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const erro = validarDisponibilidade(body?.disponibilidade);
  if (erro) return NextResponse.json({ erro }, { status: 400 });

  const professora = await prisma.professora.findFirst({ where: { id, empresaId: scope.empresaId }, select: { id: true } });
  if (!professora) return NextResponse.json({ erro: "Professor não encontrado." }, { status: 404 });

  await prisma.professora.update({ where: { id }, data: { disponibilidade: body.disponibilidade } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope || !scope.isAdmin) {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const { whatsappPausado, emailPausado, alertasProvaPausados, alertasAulaPausados, alertasConteudoPausados, alertasCobrancaPausados } = await req.json() as {
    whatsappPausado?: boolean;
    emailPausado?: boolean;
    alertasProvaPausados?: boolean;
    alertasAulaPausados?: boolean;
    alertasConteudoPausados?: boolean;
    alertasCobrancaPausados?: boolean;
  };

  if ([whatsappPausado, emailPausado, alertasProvaPausados, alertasAulaPausados, alertasConteudoPausados, alertasCobrancaPausados].some((valor) => typeof valor !== "boolean")) {
    return NextResponse.json({ erro: "Informe o status de todos os controles de alerta." }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({
    where: { id: scope.empresaId },
    data: { whatsappPausado, emailPausado, alertasProvaPausados, alertasAulaPausados, alertasConteudoPausados, alertasCobrancaPausados },
    select: { whatsappPausado: true, emailPausado: true, alertasProvaPausados: true, alertasAulaPausados: true, alertasConteudoPausados: true, alertasCobrancaPausados: true },
  });

  return NextResponse.json({ ok: true, ...empresa });
}

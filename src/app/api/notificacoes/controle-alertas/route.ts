import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope || !scope.isAdmin) {
    return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });
  }

  const { whatsappPausado, emailPausado } = await req.json() as {
    whatsappPausado?: boolean;
    emailPausado?: boolean;
  };

  if (typeof whatsappPausado !== "boolean" || typeof emailPausado !== "boolean") {
    return NextResponse.json({ erro: "Informe o status de WhatsApp e e-mail." }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({
    where: { id: scope.empresaId },
    data: { whatsappPausado, emailPausado },
    select: { whatsappPausado: true, emailPausado: true },
  });

  return NextResponse.json({ ok: true, ...empresa });
}

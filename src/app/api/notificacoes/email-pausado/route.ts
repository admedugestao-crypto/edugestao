import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope || !scope.isAdmin) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const { pausado } = await req.json() as { pausado: boolean };
  if (typeof pausado !== "boolean") {
    return NextResponse.json({ erro: "Campo 'pausado' deve ser booleano." }, { status: 400 });
  }

  await prisma.empresa.update({
    where: { id: scope.empresaId },
    data: { emailPausado: pausado },
  });

  return NextResponse.json({ ok: true, pausado });
}

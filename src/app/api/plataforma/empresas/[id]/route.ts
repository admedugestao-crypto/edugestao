import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requirePlataforma() {
  const session = await auth();
  if ((session?.user as any)?.perfil !== "PLATAFORMA") return null;
  return session;
}

// Ativa/desativa uma empresa (empresa inativa não consegue mais logar).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  if (typeof body.ativo !== "boolean") {
    return NextResponse.json({ erro: "Campo 'ativo' é obrigatório." }, { status: 400 });
  }
  const empresa = await prisma.empresa.update({ where: { id }, data: { ativo: body.ativo } });
  return NextResponse.json(empresa);
}

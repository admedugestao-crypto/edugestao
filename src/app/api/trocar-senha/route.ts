import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { senha } = await req.json();
  if (!senha || senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const id = (session.user as any).id as string;

  try {
    await prisma.usuario.update({
      where: { id },
      data: { senhaHash, senhaTemporaria: false },
    });
  } catch {
    return NextResponse.json({ erro: "Não foi possível salvar agora. Tente novamente em instantes." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

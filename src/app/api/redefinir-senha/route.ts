import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, senha } = await req.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ erro: "Link inválido." }, { status: 400 });
  }
  if (!senha || senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { resetToken: token } });

  if (!usuario || !usuario.resetTokenExpira || usuario.resetTokenExpira < new Date()) {
    return NextResponse.json({ erro: "Este link expirou ou já foi usado. Solicite um novo." }, { status: 400 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash, senhaTemporaria: false, resetToken: null, resetTokenExpira: null },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: "isaacdefigueiredo@gmail.com" },
    });

    if (!usuario) {
      return NextResponse.json({ erro: "Usuário não encontrado" });
    }

    const senhaOk = await bcrypt.compare("Mestre@1904", usuario.senhaHash);

    return NextResponse.json({
      encontrado: true,
      ativo: usuario.ativo,
      perfil: usuario.perfil,
      hashInicio: usuario.senhaHash.substring(0, 20),
      senhaCorreta: senhaOk,
      dbUrl: process.env.DATABASE_URL?.substring(0, 30) + "...",
    });
  } catch (e: any) {
    return NextResponse.json({ erro: e.message });
  }
}

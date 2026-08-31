import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PLATAFORMA_COOKIE, PLATAFORMA_SESSAO_SEGUNDOS } from "@/lib/plataformaCookie";

export const dynamic = "force-dynamic";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function POST(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.json({ erro: "Autenticação indisponível." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";
  if (!email || !senha) return NextResponse.json({ erro: "Preencha e-mail e senha." }, { status: 400 });

  const usuario = await prisma.usuario.findFirst({
    where: { email, empresaId: null, perfil: "PLATAFORMA", ativo: true },
  });
  if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const token = await encode({
    secret,
    maxAge: PLATAFORMA_SESSAO_SEGUNDOS,
    token: { id: usuario.id, name: usuario.nome, email: usuario.email, perfil: "PLATAFORMA" },
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PLATAFORMA_COOKIE, token, { ...cookieOptions, maxAge: PLATAFORMA_SESSAO_SEGUNDOS });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PLATAFORMA_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}

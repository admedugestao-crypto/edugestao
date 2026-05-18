import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const total = await prisma.usuario.count();
  return NextResponse.json({ configurado: total > 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, email, senha } = body;

  if (!nome || !email || !senha) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }

  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  // Guarda de primeiro acesso: só permite criar o primeiro usuário (SUPERADMIN)
  const totalUsuarios = await prisma.usuario.count();
  if (totalUsuarios > 0) {
    return NextResponse.json(
      { erro: "O sistema já foi configurado. Entre em contato com o administrador." },
      { status: 403 }
    );
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json({ erro: "Este e-mail já está cadastrado." }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash,
      perfil: "SUPERADMIN",
    },
  });

  return NextResponse.json({ id: usuario.id }, { status: 201 });
}

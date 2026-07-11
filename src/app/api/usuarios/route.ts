import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      foto: true,
      whatsapp: true,
      criadoEm: true,
    },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { nome, email, senha, perfil, ativo, foto, whatsapp } = body;

  if (!nome || !email || !senha) {
    return NextResponse.json({ erro: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json({ erro: "Este e-mail já está cadastrado." }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const perfilFinal = perfil === "SUPERADMIN" ? "SUPERADMIN" : "PROFESSORA";

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash,
      perfil: perfilFinal,
      ativo: ativo !== false,
      foto: foto || null,
      whatsapp: whatsapp || null,
      ...(perfilFinal === "PROFESSORA" ? { professora: { create: {} } } : {}),
    },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      foto: true,
      whatsapp: true,
      criadoEm: true,
    },
  });

  return NextResponse.json(usuario, { status: 201 });
}

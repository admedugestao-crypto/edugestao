import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

// Lista os usuários internos da plataforma (PLATAFORMA) e os administradores
// de cada empresa (SUPERADMIN) — tela única de manutenção de acessos.
export async function GET() {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const usuarios = await prisma.usuario.findMany({
    where: { perfil: { in: ["PLATAFORMA", "SUPERADMIN"] } },
    select: {
      id: true, nome: true, email: true, ativo: true, criadoEm: true, perfil: true,
      empresa: { select: { nome: true, slug: true } },
    },
    orderBy: [{ perfil: "asc" }, { nome: "asc" }],
  });
  return NextResponse.json(usuarios);
}

// Cria um novo usuário interno da plataforma.
export async function POST(req: NextRequest) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, email, senha } = body;

  if (!nome || !email || !senha) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  // empresaId é sempre null para PLATAFORMA — a unicidade de e-mail não é
  // garantida pelo banco nesse caso (NULL não colide consigo mesmo), então
  // a checagem é feita aqui.
  const existente = await prisma.usuario.findFirst({ where: { email, perfil: "PLATAFORMA" } });
  if (existente) {
    return NextResponse.json({ erro: "Este e-mail já está cadastrado." }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.create({
    data: { nome, email, senhaHash, perfil: "PLATAFORMA", empresaId: null, ativo: true },
    select: { id: true, nome: true, email: true, ativo: true, criadoEm: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}

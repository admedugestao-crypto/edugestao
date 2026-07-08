import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function slugify(nome: string) {
  return nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

async function requirePlataforma() {
  const session = await auth();
  if ((session?.user as any)?.perfil !== "PLATAFORMA") return null;
  return session;
}

// Lista todas as empresas — só o papel PLATAFORMA enxerga isso.
export async function GET() {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const empresas = await prisma.empresa.findMany({
    orderBy: { criadoEm: "desc" },
    select: { id: true, nome: true, slug: true, ativo: true, criadoEm: true, _count: { select: { usuarios: true } } },
  });
  return NextResponse.json(empresas);
}

// Cria uma empresa nova + seu primeiro usuário SUPERADMIN.
export async function POST(req: NextRequest) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { empresaNome, nome, email, senha } = body;

  if (!empresaNome || !nome || !email || !senha) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const existente = await prisma.usuario.findFirst({ where: { email } });
  if (existente) {
    return NextResponse.json({ erro: "Este e-mail já está cadastrado." }, { status: 409 });
  }

  const base = slugify(empresaNome) || "empresa";
  let slug = base;
  for (let i = 0; await prisma.empresa.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (i > 10) break;
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({ data: { nome: empresaNome, slug } });
    return tx.usuario.create({
      data: { nome, email, senhaHash, perfil: "SUPERADMIN", empresaId: empresa.id },
    });
  });

  return NextResponse.json({ id: usuario.id, empresaSlug: slug }, { status: 201 });
}

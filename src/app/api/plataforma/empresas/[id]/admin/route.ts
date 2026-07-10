import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

// Cria um novo usuário SUPERADMIN vinculado a uma empresa já existente
// (sem criar outra empresa junto — usado para adicionar um segundo admin
// ou substituir o acesso de uma empresa já cadastrada).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id: empresaId } = await params;

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    return NextResponse.json({ erro: "Empresa não encontrada." }, { status: 404 });
  }

  const body = await req.json();
  const { nome, email, senha } = body;

  if (!nome || !email || !senha) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const existente = await prisma.usuario.findUnique({
    where: { empresaId_email: { empresaId, email } },
  });
  if (existente) {
    return NextResponse.json({ erro: "Este e-mail já está cadastrado nessa empresa." }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.create({
    data: { empresaId, nome, email, senhaHash, perfil: "SUPERADMIN", ativo: true, senhaTemporaria: true },
    select: { id: true, nome: true, email: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}

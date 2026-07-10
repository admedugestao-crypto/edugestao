import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

// Edita nome/status/senha de um usuário interno da plataforma.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePlataforma();
  if (!session) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id } = await params;

  const existente = await prisma.usuario.findUnique({ where: { id } });
  if (!existente || existente.perfil !== "PLATAFORMA") {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  const body = await req.json();
  const data: { nome?: string; ativo?: boolean; senhaHash?: string } = {};

  if (typeof body.nome === "string") {
    if (!body.nome.trim()) return NextResponse.json({ erro: "Nome não pode ser vazio." }, { status: 400 });
    data.nome = body.nome.trim();
  }

  if (typeof body.ativo === "boolean") data.ativo = body.ativo;

  if (typeof body.senha === "string" && body.senha) {
    if (body.senha.length < 6) {
      return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }
    data.senhaHash = await bcrypt.hash(body.senha, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ erro: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data,
    select: { id: true, nome: true, email: true, ativo: true, criadoEm: true },
  });

  return NextResponse.json(usuario);
}

// Remove um usuário interno da plataforma (não permite autoexclusão).
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePlataforma();
  if (!session) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id } = await params;

  if (id === (session.user as any).id) {
    return NextResponse.json({ erro: "Não é possível excluir o próprio usuário." }, { status: 409 });
  }

  const existente = await prisma.usuario.findUnique({ where: { id } });
  if (!existente || existente.perfil !== "PLATAFORMA") {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  await prisma.usuario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

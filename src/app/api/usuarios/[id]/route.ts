import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nome, email, senha, perfil, ativo, foto, whatsapp, disponibilidade } = body;

  if (!nome || !email) {
    return NextResponse.json({ erro: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  // Verifica se e-mail já pertence a outro usuário
  const existente = await prisma.usuario.findFirst({
    where: { email, NOT: { id } },
  });
  if (existente) {
    return NextResponse.json({ erro: "Este e-mail já está em uso." }, { status: 409 });
  }

  const perfilFinal = perfil === "SUPERADMIN" ? "SUPERADMIN" : "PROFESSORA";

  // Busca o perfil atual para gerenciar o registro de professora
  const usuarioAtual = await prisma.usuario.findUnique({
    where: { id },
    include: { professora: true },
  });

  const dataUpdate: any = {
    nome,
    email,
    perfil: perfilFinal,
    ativo: ativo !== false,
    foto: foto || null,
    whatsapp: whatsapp || null,
  };

  // Atualiza a senha apenas se uma nova foi fornecida
  if (senha && senha.length >= 6) {
    dataUpdate.senhaHash = await bcrypt.hash(senha, 10);
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: dataUpdate,
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

  // Atualiza disponibilidade se for professora
  if (perfilFinal === "PROFESSORA") {
    if (!usuarioAtual?.professora) {
      await prisma.professora.create({ data: { usuarioId: id, disponibilidade: disponibilidade ?? [] } });
    } else if (disponibilidade !== undefined) {
      await prisma.professora.update({ where: { usuarioId: id }, data: { disponibilidade } });
    }
  }

  return NextResponse.json(usuario);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const sessionUserId = (session.user as any).id;

  // Não permite excluir o próprio usuário logado
  if (id === sessionUserId) {
    return NextResponse.json(
      { erro: "Não é possível excluir o próprio usuário." },
      { status: 409 }
    );
  }

  await prisma.usuario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { nome, email, senha, perfil, ativo, foto, whatsapp, disponibilidade } = body;

  if (!nome || !email) {
    return NextResponse.json({ erro: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  // Busca o perfil atual para gerenciar o registro de professora — também
  // confirma que o usuário pertence à empresa da sessão.
  const usuarioAtual = await prisma.usuario.findUnique({
    where: { id },
    include: { professora: true },
  });
  if (!usuarioAtual || usuarioAtual.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  // Verifica se e-mail já pertence a outro usuário da mesma empresa
  const existente = await prisma.usuario.findFirst({
    where: { email, empresaId: scope.empresaId, NOT: { id } },
  });
  if (existente) {
    return NextResponse.json({ erro: "Este e-mail já está em uso." }, { status: 409 });
  }

  const perfilFinal = perfil === "SUPERADMIN" ? "SUPERADMIN" : "PROFESSORA";

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
      await prisma.professora.create({
        data: { empresaId: scope.empresaId, usuarioId: id, disponibilidade: disponibilidade ?? [] },
      });
    } else if (disponibilidade !== undefined) {
      await prisma.professora.update({ where: { usuarioId: id }, data: { disponibilidade } });
    }
  }

  return NextResponse.json(usuario);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  // Não permite excluir o próprio usuário logado
  if (id === scope.userId) {
    return NextResponse.json(
      { erro: "Não é possível excluir o próprio usuário." },
      { status: 409 }
    );
  }

  const existente = await prisma.usuario.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  await prisma.usuario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

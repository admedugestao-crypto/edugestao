import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

const PERFIS = ["PLATAFORMA", "SUPERADMIN", "PROFESSORA", "AUXILIAR"] as const;
type PerfilValido = (typeof PERFIS)[number];

// Edita qualquer usuário do sistema — de qualquer empresa e qualquer perfil.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePlataforma();
  if (!session) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id } = await params;

  const existente = await prisma.usuario.findUnique({ where: { id }, include: { professora: true } });
  if (!existente) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    nome?: string;
    email?: string;
    ativo?: boolean;
    senhaHash?: string;
    foto?: string | null;
    whatsapp?: string | null;
    empresaId?: string | null;
    perfil?: PerfilValido;
  } = {};

  if (typeof body.nome === "string") {
    if (!body.nome.trim()) return NextResponse.json({ erro: "Nome não pode ser vazio." }, { status: 400 });
    data.nome = body.nome.trim();
  }

  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
    }
    data.email = email;
  }

  if (typeof body.ativo === "boolean") data.ativo = body.ativo;

  if (typeof body.foto === "string") data.foto = body.foto || null;
  if (typeof body.whatsapp === "string") data.whatsapp = body.whatsapp || null;

  if (typeof body.senha === "string" && body.senha) {
    if (body.senha.length < 6) {
      return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }
    data.senhaHash = await bcrypt.hash(body.senha, 10);
  }

  // Perfil e empresa são decididos juntos: PLATAFORMA nunca tem empresa,
  // os demais perfis exigem uma.
  if ("perfil" in body || "empresaId" in body) {
    const perfil: PerfilValido = PERFIS.includes(body.perfil) ? body.perfil : existente.perfil;

    if (perfil === "PLATAFORMA") {
      data.perfil = "PLATAFORMA";
      data.empresaId = null;
    } else {
      const empresaId: string | null = "empresaId" in body
        ? (typeof body.empresaId === "string" && body.empresaId ? body.empresaId : null)
        : existente.empresaId;
      if (!empresaId) {
        return NextResponse.json({ erro: "Escolha a empresa para esse perfil." }, { status: 400 });
      }
      const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
      if (!empresa) {
        return NextResponse.json({ erro: "Empresa não encontrada." }, { status: 404 });
      }
      data.perfil = perfil;
      data.empresaId = empresaId;
    }
  }

  if (Object.keys(data).length === 0 && body.disponibilidade === undefined) {
    return NextResponse.json({ erro: "Nenhum campo para atualizar." }, { status: 400 });
  }

  // Sem empresa, a unicidade de e-mail não é garantida pelo banco (NULL não
  // colide consigo mesmo), então é checada manualmente sempre que o e-mail
  // final ou o vínculo com empresa mudam.
  const empresaIdFinal = "empresaId" in data ? data.empresaId : existente.empresaId;
  const emailFinal = data.email ?? existente.email;
  if (!empresaIdFinal && (data.email !== undefined || "empresaId" in data)) {
    const outroPlataforma = await prisma.usuario.findFirst({
      where: { email: emailFinal, perfil: "PLATAFORMA", NOT: { id } },
    });
    if (outroPlataforma) {
      return NextResponse.json({ erro: "Este e-mail já está cadastrado como usuário da plataforma." }, { status: 409 });
    }
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nome: true, email: true, ativo: true, criadoEm: true },
    });

    // Disponibilidade (agenda de horários) é independente do perfil — quem
    // dá aula precisa desse registro, mesmo que seja SUPERADMIN/AUXILIAR
    // também atendendo alunos. Só cria/atualiza, nunca remove automaticamente.
    const perfilFinal = data.perfil ?? existente.perfil;
    if (body.disponibilidade !== undefined) {
      if (!empresaIdFinal) {
        return NextResponse.json({ erro: "Disponibilidade exige uma empresa vinculada." }, { status: 400 });
      }
      if (!existente.professora) {
        await prisma.professora.create({
          data: { empresaId: empresaIdFinal, usuarioId: id, disponibilidade: body.disponibilidade },
        });
      } else {
        await prisma.professora.update({
          where: { usuarioId: id },
          data: { empresaId: empresaIdFinal, disponibilidade: body.disponibilidade },
        });
      }
    } else if (perfilFinal === "PROFESSORA" && !existente.professora && empresaIdFinal) {
      await prisma.professora.create({
        data: { empresaId: empresaIdFinal, usuarioId: id, disponibilidade: [] },
      });
    } else if (existente.professora && empresaIdFinal && existente.professora.empresaId !== empresaIdFinal) {
      // Usuário religado para outra empresa — mantém o registro de professora
      // consistente com a empresa atual.
      await prisma.professora.update({ where: { usuarioId: id }, data: { empresaId: empresaIdFinal } });
    }

    return NextResponse.json(usuario);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ erro: "Este e-mail já está cadastrado nessa empresa." }, { status: 409 });
    }
    throw err;
  }
}

// PLATAFORMA e SUPERADMIN nunca podem ser excluídos, só desativados (perda
// de acesso é revertida ativando de novo, não recriando). PROFESSORA e
// AUXILIAR podem ser removidos de verdade — mesma regra que já existia
// quando esse cadastro vivia dentro de cada empresa.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id } = await params;

  const existente = await prisma.usuario.findUnique({ where: { id }, select: { perfil: true } });
  if (!existente) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }
  if (existente.perfil === "PLATAFORMA" || existente.perfil === "SUPERADMIN") {
    return NextResponse.json(
      { erro: "Usuários PLATAFORMA e SUPERADMIN não podem ser excluídos. Desative o acesso em vez disso." },
      { status: 405 }
    );
  }

  await prisma.usuario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

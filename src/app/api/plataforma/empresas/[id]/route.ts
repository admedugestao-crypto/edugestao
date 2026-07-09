import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

async function requirePlataforma() {
  const session = await auth();
  if ((session?.user as any)?.perfil !== "PLATAFORMA") return null;
  return session;
}

// Atualiza dados de uma empresa: ativa/desativa (empresa inativa não consegue
// mais logar) e/ou edita nome/código (slug usado na 1ª etapa do login).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const data: { ativo?: boolean; nome?: string; slug?: string } = {};

  if (typeof body.ativo === "boolean") data.ativo = body.ativo;

  if (typeof body.nome === "string") {
    if (!body.nome.trim()) return NextResponse.json({ erro: "Nome não pode ser vazio." }, { status: 400 });
    data.nome = body.nome.trim();
  }

  if (typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (!slug) return NextResponse.json({ erro: "Código inválido." }, { status: 400 });
    const existente = await prisma.empresa.findUnique({ where: { slug } });
    if (existente && existente.id !== id) {
      return NextResponse.json({ erro: "Este código já está em uso por outra empresa." }, { status: 409 });
    }
    data.slug = slug;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ erro: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({ where: { id }, data });
  return NextResponse.json(empresa);
}

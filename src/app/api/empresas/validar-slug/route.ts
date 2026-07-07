import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Rota pública — usada na 1ª etapa do login para validar o código da
// empresa antes de mostrar o formulário de e-mail/senha.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
  if (!slug) return NextResponse.json({ erro: "Informe o código da empresa." }, { status: 400 });

  const empresa = await prisma.empresa.findUnique({ where: { slug }, select: { nome: true, ativo: true } });
  if (!empresa || !empresa.ativo) {
    return NextResponse.json({ erro: "Empresa não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ nome: empresa.nome });
}

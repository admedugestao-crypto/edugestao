import { NextRequest, NextResponse } from "next/server";
import { requirePlataforma } from "@/lib/plataforma";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requirePlataforma())) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  const pagina = Math.max(1, Math.min(100000, Number(req.nextUrl.searchParams.get("pagina")) || 1));
  const [inscricoes, total] = await Promise.all([
    prisma.inscricaoTeste.findMany({ orderBy: [{ criadoEm: "desc" }, { id: "desc" }], skip: (Math.floor(pagina) - 1) * 50, take: 50, omit: { origemHash: true } }),
    prisma.inscricaoTeste.count(),
  ]);
  return NextResponse.json({ inscricoes, total }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(req: NextRequest) {
  if (!(await requirePlataforma())) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || body.id.length > 100 || typeof body.contatado !== "boolean") {
    return NextResponse.json({ erro: "Informe uma inscrição e a situação do contato." }, { status: 400 });
  }
  const resultado = await prisma.inscricaoTeste.updateMany({ where: { id: body.id }, data: { contatadoEm: body.contatado ? new Date() : null } });
  if (!resultado.count) return NextResponse.json({ erro: "Inscrição não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

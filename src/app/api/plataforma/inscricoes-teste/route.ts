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

export async function DELETE(req: NextRequest) {
  if (!(await requirePlataforma())) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ erro: "Exclua a inscrição pela plataforma." }, { status: 403 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > 1024) {
    return NextResponse.json({ erro: "Solicitação inválida." }, { status: 413 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !body.id.trim() || body.id.length > 100 || body.confirmacao !== true) {
    return NextResponse.json({ erro: "Informe e confirme a inscrição que deseja excluir." }, { status: 400 });
  }
  try {
    const resultado = await prisma.inscricaoTeste.deleteMany({ where: { id: body.id } });
    if (!resultado.count) return NextResponse.json({ erro: "Inscrição não encontrada. Atualize a lista." }, { status: 404 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ erro: "Não foi possível excluir a inscrição. Tente novamente." }, { status: 503 });
  }
}

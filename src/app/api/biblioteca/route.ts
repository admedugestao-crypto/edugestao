import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const metodoId = searchParams.get("metodoId");
  const serie = searchParams.get("serie");
  const materiaId = searchParams.get("materiaId");

  const materiais = await prisma.materialBiblioteca.findMany({
    where: {
      empresaId: scope.empresaId,
      ...(metodoId ? { metodoId } : {}),
      ...(serie ? { serie } : {}),
      ...(materiaId ? { materiaId } : {}),
    },
    include: { materia: true, metodoEnsino: true },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(materiais);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  if (!body.titulo || !body.descricao || !body.metodoId || !body.serie || !body.materiaId || !body.arquivoUrl) {
    return NextResponse.json(
      { erro: "Título, descrição, método, série, disciplina e arquivo são obrigatórios." },
      { status: 400 }
    );
  }

  const metodo = await prisma.metodoEnsino.findUnique({ where: { id: body.metodoId }, select: { empresaId: true } });
  if (!metodo || metodo.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Método inválido." }, { status: 400 });
  }

  const material = await prisma.materialBiblioteca.create({
    data: {
      empresaId: scope.empresaId,
      titulo: body.titulo,
      descricao: body.descricao,
      metodoId: body.metodoId,
      serie: body.serie,
      materiaId: body.materiaId,
      arquivoUrl: body.arquivoUrl,
      arquivoNome: body.arquivoNome || null,
    },
    include: { materia: true, metodoEnsino: true },
  });
  return NextResponse.json(material, { status: 201 });
}

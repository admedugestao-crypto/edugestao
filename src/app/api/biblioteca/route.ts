import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { normalizarIds } from "@/lib/entityIds";

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
      ...(materiaId ? { materias: { some: { materiaId } } } : {}),
    },
    include: { materia: true, metodoEnsino: true, materias: { select: { materia: true } } },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(materiais);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const materiaIds = normalizarIds(body.materiaIds);
  if (!body.titulo || !body.descricao || !body.metodoId || !body.serie || materiaIds.length === 0 || !body.arquivoUrl) {
    return NextResponse.json(
      { erro: "Título, descrição, método, série, disciplina(s) e arquivo são obrigatórios." },
      { status: 400 }
    );
  }

  const [metodo, materias] = await Promise.all([
    prisma.metodoEnsino.findFirst({ where: { id: body.metodoId, empresaId: scope.empresaId }, select: { id: true } }),
    prisma.materia.findMany({ where: { id: { in: materiaIds }, empresaId: scope.empresaId }, select: { id: true } }),
  ]);
  if (!metodo) {
    return NextResponse.json({ erro: "Método inválido." }, { status: 400 });
  }
  if (materias.length !== materiaIds.length) {
    return NextResponse.json({ erro: "Uma ou mais disciplinas são inválidas." }, { status: 400 });
  }

  const material = await prisma.materialBiblioteca.create({
    data: {
      empresaId: scope.empresaId,
      titulo: body.titulo,
      descricao: body.descricao,
      metodoId: body.metodoId,
      serie: body.serie,
      materiaId: materiaIds[0],
      arquivoUrl: body.arquivoUrl,
      arquivoNome: body.arquivoNome || null,
      materias: { create: materiaIds.map((materiaId) => ({ materiaId })) },
    },
    include: { materia: true, metodoEnsino: true, materias: { select: { materia: true } } },
  });
  return NextResponse.json(material, { status: 201 });
}

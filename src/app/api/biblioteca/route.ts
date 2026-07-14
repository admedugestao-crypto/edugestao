import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const metodo = searchParams.get("metodo");
  const serie = searchParams.get("serie");
  const materiaId = searchParams.get("materiaId");

  const materiais = await prisma.materialBiblioteca.findMany({
    where: {
      empresaId: scope.empresaId,
      ...(metodo ? { metodo } : {}),
      ...(serie ? { serie } : {}),
      ...(materiaId ? { materiaId } : {}),
    },
    include: { materia: true },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(materiais);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  if (!body.titulo || !body.arquivoUrl) {
    return NextResponse.json({ erro: "Título e arquivo são obrigatórios." }, { status: 400 });
  }

  const material = await prisma.materialBiblioteca.create({
    data: {
      empresaId: scope.empresaId,
      titulo: body.titulo,
      descricao: body.descricao || null,
      metodo: body.metodo || null,
      serie: body.serie || null,
      materiaId: body.materiaId || null,
      arquivoUrl: body.arquivoUrl,
      arquivoNome: body.arquivoNome || null,
    },
    include: { materia: true },
  });
  return NextResponse.json(material, { status: 201 });
}

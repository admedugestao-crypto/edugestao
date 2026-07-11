import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id: professoraId } = await params;
  const { materiaId } = await req.json();

  const [professoraOk, materiaOk] = await Promise.all([
    prisma.professora.findFirst({ where: { id: professoraId, empresaId: scope.empresaId }, select: { id: true } }),
    prisma.materia.findFirst({ where: { id: materiaId, empresaId: scope.empresaId }, select: { id: true } }),
  ]);
  if (!professoraOk || !materiaOk) {
    return NextResponse.json({ erro: "Professora ou matéria não encontrada." }, { status: 404 });
  }

  const pm = await prisma.professoraMateria.upsert({
    where: { professoraId_materiaId: { professoraId, materiaId } },
    update: {},
    create: { professoraId, materiaId },
  });
  return NextResponse.json(pm, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id: professoraId } = await params;
  const { materiaId } = await req.json();

  const professoraOk = await prisma.professora.findFirst({
    where: { id: professoraId, empresaId: scope.empresaId },
    select: { id: true },
  });
  if (!professoraOk) return NextResponse.json({ erro: "Professora não encontrada." }, { status: 404 });

  await prisma.professoraMateria.delete({
    where: { professoraId_materiaId: { professoraId, materiaId } },
  });
  return NextResponse.json({ ok: true });
}

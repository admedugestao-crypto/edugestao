import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id: professoraId } = await params;
  const { materiaId } = await req.json();

  const pm = await prisma.professoraMateria.upsert({
    where: { professoraId_materiaId: { professoraId, materiaId } },
    update: {},
    create: { professoraId, materiaId },
  });
  return NextResponse.json(pm, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id: professoraId } = await params;
  const { materiaId } = await req.json();

  await prisma.professoraMateria.delete({
    where: { professoraId_materiaId: { professoraId, materiaId } },
  });
  return NextResponse.json({ ok: true });
}

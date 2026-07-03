import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validarAgenda } from "@/lib/conteudoAgenda";

export const dynamic = "force-dynamic";

// GET /api/conteudos?aulaId=...
// Busca o conteúdo já vinculado a esta aula exata (se houver) — usado pela
// agenda (mobile e desktop) para decidir entre editar ou criar ao marcar
// uma aula como Realizada.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const aulaId = searchParams.get("aulaId");
  if (!aulaId) {
    return NextResponse.json({ erro: "aulaId é obrigatório" }, { status: 400 });
  }

  const conteudo = await prisma.conteudo.findUnique({
    where: { aulaId },
    include: { materia: true },
  });

  return NextResponse.json(conteudo);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body     = await req.json();
  const dataAula = new Date(body.data);
  const planejado = body.planejado ?? false;
  const aulaId: string | null = body.aulaId || null;

  // Planejado: sem validação de agenda
  // Ministrado vindo da agenda (aulaId presente): pula validação — o cliente marca REALIZADA logo após
  // Ministrado avulso: exige aula com status REALIZADA
  if (!planejado && !aulaId) {
    const validacao = await validarAgenda(body.alunoId, dataAula, planejado);
    if (!validacao.ok) return NextResponse.json({ erro: validacao.erro }, { status: 422 });
  }

  try {
    const conteudo = await prisma.conteudo.create({
      data: {
        alunoId:    body.alunoId,
        materiaId:  body.materiaId || null,
        aulaId,
        topico:     body.topico,
        descricao:  body.descricao  || null,
        arquivoUrl: body.arquivoUrl || null,
        data:       dataAula,
        planejado,
      },
      include: {
        aluno: {
          select: {
            nome: true,
            professora: { select: { usuario: { select: { nome: true } } } },
          },
        },
        materia: true,
      },
    });
    return NextResponse.json(conteudo, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002" && err?.meta?.target?.includes("aulaId")) {
      return NextResponse.json({ erro: "Já existe um conteúdo registrado para esta aula." }, { status: 409 });
    }
    throw err;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── Validação de agenda ────────────────────────────────────────────────────────
// Planejado  → agenda deve estar com status AGENDADA
// Ministrado → agenda deve estar com status REALIZADA
async function validarAgenda(
  alunoId:  string,
  data:     Date,
  planejado: boolean,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const dY = data.getUTCFullYear();
  const dM = data.getUTCMonth();
  const dD = data.getUTCDate();

  const aula = await prisma.agendaAula.findFirst({
    where: {
      alunoId,
      data: {
        gte: new Date(Date.UTC(dY, dM, dD)),
        lt:  new Date(Date.UTC(dY, dM, dD + 1)),
      },
    },
    select: { status: true },
  });

  if (!aula) {
    return { ok: false, erro: "Não existe aula agendada para este aluno nesta data." };
  }

  const statusEsperado = planejado ? "AGENDADA" : "REALIZADA";
  if (aula.status !== statusEsperado) {
    return {
      ok: false,
      erro: planejado
        ? `Conteúdo planejado requer aula com status Agendada (atual: ${aula.status}).`
        : `Conteúdo ministrado requer aula com status Realizada (atual: ${aula.status}).`,
    };
  }

  return { ok: true };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body     = await req.json();
  const dataAula = new Date(body.data);
  const planejado = body.planejado ?? false;

  // Quando chamado diretamente da agenda (aulaId presente), pula validação de status
  if (!body.aulaId) {
    const validacao = await validarAgenda(body.alunoId, dataAula, planejado);
    if (!validacao.ok) return NextResponse.json({ erro: validacao.erro }, { status: 422 });
  }

  const conteudo = await prisma.conteudo.create({
    data: {
      alunoId:    body.alunoId,
      materiaId:  body.materiaId,
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
}

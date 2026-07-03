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
    return { ok: false, erro: "Não existe Aula Agendada para este aluno nesta data." };
  }

  const statusEsperado = planejado ? "AGENDADA" : "REALIZADA";
  if (aula.status !== statusEsperado) {
    return {
      ok: false,
      erro: planejado
        ? `Conteúdo planejado requer agenda com status Agendada (atual: ${aula.status}).`
        : `Conteúdo ministrado requer agenda com status Realizada (atual: ${aula.status}).`,
    };
  }

  return { ok: true };
}

// GET /api/conteudos?alunoId=...&data=YYYY-MM-DD
// Busca o conteúdo já cadastrado para este aluno nesta data (se houver) —
// usado pela agenda mobile para decidir entre editar ou criar ao marcar
// uma aula como Realizada.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const alunoId = searchParams.get("alunoId");
  const dataStr = searchParams.get("data");
  if (!alunoId || !dataStr) {
    return NextResponse.json({ erro: "alunoId e data são obrigatórios" }, { status: 400 });
  }

  const [y, m, d] = dataStr.split("-").map(Number);
  const conteudo = await prisma.conteudo.findFirst({
    where: {
      alunoId,
      data: { gte: new Date(Date.UTC(y, m - 1, d)), lt: new Date(Date.UTC(y, m - 1, d + 1)) },
    },
    include: { materia: true },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(conteudo);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body     = await req.json();
  const dataAula = new Date(body.data);
  const planejado = body.planejado ?? false;

  // Planejado: sem validação de agenda
  // Ministrado vindo da agenda (aulaId presente): pula validação — o cliente marca REALIZADA logo após
  // Ministrado avulso: exige aula com status REALIZADA
  if (!planejado && !body.aulaId) {
    const validacao = await validarAgenda(body.alunoId, dataAula, planejado);
    if (!validacao.ok) return NextResponse.json({ erro: validacao.erro }, { status: 422 });
  }

  const conteudo = await prisma.conteudo.create({
    data: {
      alunoId:    body.alunoId,
      materiaId:  body.materiaId || null,
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

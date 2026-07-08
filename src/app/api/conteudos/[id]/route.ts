import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { validarAgenda } from "@/lib/conteudoAgenda";

export const dynamic = "force-dynamic";

const includeCompleto = {
  aluno: {
    select: {
      nome: true,
      professora: { select: { usuario: { select: { nome: true } } } },
    },
  },
  materia: true,
  aula: {
    select: {
      id: true, horaInicio: true, horaFim: true, status: true,
      materia: { select: { nome: true, cor: true } },
      aluno: { select: { nome: true } },
    },
  },
} as const;

// GET /api/conteudos/[id] — busca o conteúdo com o vínculo de agenda
// atualizado (usado pelo client para refrescar a linha do grid após
// marcar Ministrado / reverter para Planejado, sem precisar de F5).
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const conteudo = await prisma.conteudo.findUnique({ where: { id }, include: includeCompleto });
  if (!conteudo || conteudo.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });
  }
  return NextResponse.json(conteudo);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id }    = await params;
  const body      = await req.json();
  const dataAula  = new Date(body.data);
  const planejado = body.planejado ?? false;

  const existente = await prisma.conteudo.findUnique({ where: { id }, select: { aulaId: true, empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });
  }

  // aulaIdEscolhido: quando o usuário resolveu manualmente uma ambiguidade
  // (aluno com +1 aula candidata) escolhendo qual aula vincular.
  const aulaIdParaValidar = existente.aulaId || body.aulaIdEscolhido || null;
  const validacao = await validarAgenda(scope.empresaId, body.alunoId, dataAula, planejado, aulaIdParaValidar, body.materiaId || null);
  if (!validacao.ok) {
    return NextResponse.json({ erro: validacao.erro, candidatas: validacao.candidatas }, { status: 422 });
  }

  const conteudo = await prisma.conteudo.update({
    where: { id },
    data: {
      alunoId:    body.alunoId,
      materiaId:  body.materiaId || null,
      topico:     body.topico,
      descricao:  body.descricao  || null,
      arquivoUrl: body.arquivoUrl !== undefined ? body.arquivoUrl || null : undefined,
      data:       dataAula,
      planejado,
    },
    include: includeCompleto,
  });
  return NextResponse.json(conteudo);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  // Bloqueia exclusão se houver aula com status REALIZADA vinculada a este conteúdo.
  // Só considera vínculo real (aulaId gravado) — nunca por inferência de
  // aluno+data+matéria, que pode "achar" a aula de OUTRO conteúdo do mesmo dia.
  const conteudo = await prisma.conteudo.findUnique({
    where: { id },
    select: { aulaId: true, empresaId: true },
  });
  if (!conteudo || conteudo.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });
  }
  if (conteudo?.aulaId) {
    const aula = await prisma.agendaAula.findUnique({ where: { id: conteudo.aulaId }, select: { status: true } });
    if (aula?.status === "REALIZADA") {
      return NextResponse.json(
        { erro: "Não é possível excluir: existe uma agenda com status Realizada vinculada a este conteúdo." },
        { status: 422 },
      );
    }
  }

  await prisma.conteudo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { validarAgenda } from "@/lib/conteudoAgenda";

export const dynamic = "force-dynamic";

// GET /api/conteudos?aulaId=...
// Busca o conteúdo já vinculado a esta aula exata (se houver) — usado pela
// agenda (mobile e desktop) para decidir entre editar ou criar ao marcar
// uma aula como Realizada.
export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const aulaId = searchParams.get("aulaId");
  if (!aulaId) {
    return NextResponse.json({ erro: "aulaId é obrigatório" }, { status: 400 });
  }

  const conteudo = await prisma.conteudo.findUnique({
    where: { aulaId },
    include: { materia: true },
  });

  if (conteudo && conteudo.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  return NextResponse.json(conteudo);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body     = await req.json();
  const dataAula = new Date(body.data);
  const planejado = body.planejado ?? false;
  const aulaId: string | null = body.aulaId || null;
  const materiaId: string | null = body.materiaId || null;
  const forcar   = body.forcar === true;
  // aulaIdEscolhido: usuário resolveu manualmente uma ambiguidade (aluno com
  // +1 aula candidata) escolhendo qual aula vincular.
  const aulaIdEscolhido: string | null = body.aulaIdEscolhido || null;

  const alunoOk = await prisma.aluno.findFirst({
    where: { id: body.alunoId, empresaId: scope.empresaId },
    select: { id: true },
  });
  if (!alunoOk) return NextResponse.json({ erro: "Aluno não encontrado." }, { status: 404 });

  // Planejado: sem validação de agenda
  // Ministrado vindo da agenda (aulaId presente): pula validação — o cliente marca REALIZADA logo após
  // Ministrado avulso: exige aula com status REALIZADA
  if (!planejado && !aulaId) {
    const validacao = await validarAgenda(scope.empresaId, body.alunoId, dataAula, planejado, aulaIdEscolhido, materiaId);
    if (!validacao.ok) return NextResponse.json({ erro: validacao.erro, candidatas: validacao.candidatas }, { status: 422 });
  }

  // Aviso (não bloqueio): data não-futura e já existe conteúdo Ministrado
  // para o mesmo aluno/matéria/dia — provavelmente duplicado por engano.
  // Pede confirmação (forcar=true) antes de criar mesmo assim.
  if (!forcar && !aulaId) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    if (dataAula <= hoje) {
      const existente = await prisma.conteudo.findFirst({
        where: { alunoId: body.alunoId, materiaId, data: dataAula, planejado: false },
        select: { topico: true },
      });
      if (existente) {
        return NextResponse.json(
          { aviso: `Já existe conteúdo Ministrado para este aluno/matéria nesta data (tópico: "${existente.topico}"). Deseja criar mesmo assim?` },
          { status: 409 },
        );
      }
    }
  }

  try {
    const conteudo = await prisma.conteudo.create({
      data: {
        empresaId:  scope.empresaId,
        alunoId:    body.alunoId,
        materiaId,
        aulaId: aulaId || (!planejado ? aulaIdEscolhido : null),
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
        aula: {
          select: {
            id: true, horaInicio: true, horaFim: true, status: true,
            materia: { select: { nome: true, cor: true } },
            aluno: { select: { nome: true } },
          },
        },
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

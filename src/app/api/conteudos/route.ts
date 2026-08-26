import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { validarAulaParaMinistrado, materiasCompativeis, type AulaCandidata } from "@/lib/conteudoAgenda";
import { enviarNotificacaoConteudoMinistrado } from "@/lib/notificacoes";
import { gerarPagamentoAula, type ParcelaGerada } from "@/lib/motorCobranca";
import { normalizarIds, todosIdsEncontrados } from "@/lib/entityIds";

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
    include: { materia: true, materias: { select: { materia: true } } },
  });

  if (conteudo) {
    if (conteudo.empresaId !== scope.empresaId) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
    }
    return NextResponse.json(conteudo);
  }

  // Sem vínculo direto: procura um conteúdo Planejado do mesmo aluno/dia/
  // matéria que ainda não foi vinculado a nenhuma aula — evita duplicar
  // quando o professor já tinha planejado o conteúdo antes de dar a aula
  // (mesma regra usada em ConteudosClient.tsx pro fluxo do desktop).
  const aula = await prisma.agendaAula.findUnique({
    where: { id: aulaId, empresaId: scope.empresaId },
    select: {
      alunoId: true, data: true, materiaId: true,
      materias: { select: { materiaId: true } },
    },
  });
  if (!aula) return NextResponse.json(null);

  const aulaMateriaIds = aula.materias.length > 0
    ? aula.materias.map((m) => m.materiaId)
    : (aula.materiaId ? [aula.materiaId] : []);

  const dY = aula.data.getUTCFullYear();
  const dM = aula.data.getUTCMonth();
  const dD = aula.data.getUTCDate();

  const candidatos = await prisma.conteudo.findMany({
    where: {
      empresaId: scope.empresaId,
      alunoId:   aula.alunoId,
      planejado: true,
      aulaId:    null,
      data: {
        gte: new Date(Date.UTC(dY, dM, dD)),
        lt:  new Date(Date.UTC(dY, dM, dD + 1)),
      },
    },
    include: { materia: true, materias: { select: { materia: true } } },
  });
  const compativel = candidatos.find((c) =>
    materiasCompativeis(c.materias.map((m) => m.materia.id), aulaMateriaIds),
  );

  return NextResponse.json(compativel ?? null);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body     = await req.json();
  const dataAula = new Date(body.data);
  const planejado = body.planejado ?? false;
  const aulaId: string | null = typeof body.aulaId === "string" && body.aulaId.trim() ? body.aulaId.trim() : null;
  const materiaIds = normalizarIds(body.materiaIds);
  const forcar   = body.forcar === true;
  // aulaIdEscolhido: usuário resolveu manualmente uma ambiguidade (aluno com
  // +1 aula candidata) escolhendo qual aula vincular.
  const aulaIdEscolhido: string | null = body.aulaIdEscolhido || null;

  const [alunoOk, materiasOk, aulaOk] = await Promise.all([
    prisma.aluno.findFirst({
      where: { id: body.alunoId, empresaId: scope.empresaId },
      select: { id: true },
    }),
    materiaIds.length > 0
      ? prisma.materia.findMany({
          where: { id: { in: materiaIds }, empresaId: scope.empresaId },
          select: { id: true },
        })
      : Promise.resolve([]),
    aulaId
      ? prisma.agendaAula.findFirst({
          where: { id: aulaId, empresaId: scope.empresaId, alunoId: body.alunoId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (!alunoOk) return NextResponse.json({ erro: "Aluno não encontrado." }, { status: 404 });
  if (!todosIdsEncontrados(materiaIds, materiasOk.map((materia) => materia.id))) {
    return NextResponse.json({ erro: "Uma ou mais matérias não foram encontradas." }, { status: 404 });
  }
  if (aulaId && !aulaOk) {
    return NextResponse.json({ erro: "Aula não encontrada para este aluno." }, { status: 404 });
  }

  // Planejado: sem validação de agenda
  // Ministrado vindo da agenda (aulaId presente): pula validação — o cliente marca REALIZADA logo após
  // Ministrado avulso (sem vir da tela de Agenda): impreterivelmente precisa
  // achar uma Aula Agendada compatível pra vincular — não dá pra registrar
  // um Ministrado "solto", sem aula por trás. A função já retorna a aula
  // encontrada, que é usada abaixo pra vincular e marcar Realizada.
  let aulaMinistradoAvulso: AulaCandidata | null = null;
  if (!planejado && !aulaId) {
    const resultado = await validarAulaParaMinistrado({
      empresaId: scope.empresaId,
      alunoId: body.alunoId,
      data: dataAula,
      materiaIds,
      aulaId: aulaIdEscolhido,
    });
    if (!resultado.ok) return NextResponse.json({ erro: resultado.erro, candidatas: resultado.candidatas }, { status: 422 });
    aulaMinistradoAvulso = resultado.aula;
  }

  // Aviso (não bloqueio): data não-futura e já existe conteúdo Ministrado
  // para o mesmo aluno/matéria/dia — provavelmente duplicado por engano.
  // Pede confirmação (forcar=true) antes de criar mesmo assim.
  if (!forcar && !aulaId) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    if (dataAula <= hoje) {
      const candidatosMesmoDia = await prisma.conteudo.findMany({
        where: { alunoId: body.alunoId, data: dataAula, planejado: false },
        select: { topico: true, materias: { select: { materiaId: true } } },
      });
      const existente = candidatosMesmoDia.find((c) =>
        materiasCompativeis(c.materias.map((m) => m.materiaId), materiaIds),
      );
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
        materiaId:  materiaIds[0] ?? null,
        aulaId: aulaId || aulaMinistradoAvulso?.id || null,
        topico:     body.topico,
        descricao:  body.descricao  || null,
        arquivoUrl: body.arquivoUrl || null,
        data:       dataAula,
        planejado,
        materias: materiaIds.length > 0
          ? { create: materiaIds.map((materiaId) => ({ materiaId })) }
          : undefined,
      },
      include: {
        aluno: {
          select: {
            nome: true,
            professora: { select: { usuario: { select: { nome: true } } } },
          },
        },
        materia: true,
        materias: { select: { materia: true } },
        aula: {
          select: {
            id: true, horaInicio: true, horaFim: true, status: true,
            materia: { select: { nome: true, cor: true } },
            aluno: { select: { nome: true } },
          },
        },
      },
    });

    // Ministrado avulso recém-vinculado a uma Aula Agendada: marca a agenda
    // como Realizada e gera a cobrança na hora — mesmo comportamento de
    // quem converte um Planejado pra Ministrado (ver /ministrado/route.ts).
    let avisoPagamento: string | undefined;
    let pagamentoGerado: ParcelaGerada | undefined;
    if (aulaMinistradoAvulso) {
      await prisma.agendaAula.update({
        where: { id: aulaMinistradoAvulso.id },
        data: { status: "REALIZADA" },
      });
      try {
        const resultado = await gerarPagamentoAula(scope.empresaId, aulaMinistradoAvulso.id);
        if (!resultado.semCobranca) pagamentoGerado = resultado.parcela;
      } catch (e) {
        console.error("Falha ao gerar pagamento automático:", e);
        avisoPagamento = "Conteúdo salvo, mas não foi possível gerar a cobrança automaticamente.";
      }
    }

    if (!planejado) {
      // Best-effort: criado com sucesso independente do e-mail dar certo.
      try {
        await enviarNotificacaoConteudoMinistrado(conteudo.id);
      } catch (err) {
        console.error(`[ConteudoMinistrado] Falha ao notificar responsável (conteudo ${conteudo.id}):`, err);
      }
    }

    return NextResponse.json({ ...conteudo, pagamentoGerado, avisoPagamento }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002" && err?.meta?.target?.includes("aulaId")) {
      return NextResponse.json({ erro: "Já existe um conteúdo registrado para esta aula." }, { status: 409 });
    }
    throw err;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function utcDia(str: string): Date {
  return new Date(str); // "2026-05-20" → 2026-05-20T00:00:00.000Z
}
function utcDiaNum(y: number, m0: number, d: number): Date {
  return new Date(Date.UTC(y, m0, d));
}
function fmtBr(iso: string) {
  return iso.split("-").reverse().join("/");
}

// POST /api/agenda/[id]/repor
// Body: { alunoId?, professoraId?, materiaIds?, data, horaInicio, horaFim, observacao? }
//
// Cria uma aula de reposição no lugar de `id` (que é excluída ao final) e
// sempre cria um pagamento manual referente à aula original excluída — o
// valor por aula (aluno.valorCobranca) independe do tipoCobranca, que só
// define a periodicidade da cobrança normal. A reposição em si é marcada com
// reposicao=true para não ser cobrada de novo pela geração de cobrança mensal.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { alunoId: bodyAlunoId, professoraId: bodyProfId, materiaIds: materiaIdsBody, data, horaInicio, horaFim, observacao } = body;

  const aulaOriginal = await prisma.agendaAula.findUnique({
    where: { id },
    include: { aluno: { select: { id: true, tipoCobranca: true, valorCobranca: true } } },
  });
  if (!aulaOriginal || aulaOriginal.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Aula não encontrada" }, { status: 404 });
  }

  // Mesmo guard da exclusão simples: bloqueia se já vinculada a pagamento quitado
  const vinculosPagos = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count
    FROM pagamento_aulas pa
    JOIN pagamentos p ON p.id = pa."pagamentoId"
    WHERE pa."agendaAulaId" = ${id} AND p.pago = true
  `;
  if (Number(vinculosPagos[0].count) > 0) {
    return NextResponse.json(
      { erro: "Não é possível repor: esta Aula Agendada está vinculada a um pagamento já quitado." },
      { status: 422 },
    );
  }

  const alunoId = bodyAlunoId || aulaOriginal.alunoId;
  const professoraId = scope.isAdmin ? (bodyProfId ?? aulaOriginal.professoraId) : (scope.professoraId ?? null);

  if (!professoraId)
    return NextResponse.json({ erro: "professoraId é obrigatório" }, { status: 403 });
  if (!data || !horaInicio || !horaFim)
    return NextResponse.json({ erro: "Data, início e fim são obrigatórios" }, { status: 400 });

  // Duração mínima de 30 minutos — o fluxo de reposição permite meia hora (o de
  // criação normal de aula exige 1h, validado no client em AgendaClient/AgendaMobile).
  const [hi, mi] = (horaInicio as string).split(":").map(Number);
  const [hf, mf] = (horaFim as string).split(":").map(Number);
  const duracaoMin = (hf * 60 + mf) - (hi * 60 + mi);
  if (duracaoMin < 30) {
    return NextResponse.json({ erro: "A duração mínima da aula de reposição é de 30 minutos." }, { status: 400 });
  }

  const [alunoOk, professoraOk] = await Promise.all([
    prisma.aluno.findFirst({ where: { id: alunoId, empresaId: scope.empresaId }, select: { id: true } }),
    prisma.professora.findFirst({ where: { id: professoraId, empresaId: scope.empresaId }, select: { id: true } }),
  ]);
  if (!alunoOk || !professoraOk) {
    return NextResponse.json({ erro: "Aluno ou professora não encontrados." }, { status: 404 });
  }

  const dataObj = utcDia(data as string);
  const [dy, dm, dd] = (data as string).split("-").map(Number);
  const rangeGte = utcDiaNum(dy, dm - 1, dd);
  const rangeLt = utcDiaNum(dy, dm - 1, dd + 1);

  // Conflito de horário na nova data (mesma checagem de POST /api/agenda)
  const aulasNoDia = await prisma.agendaAula.findMany({
    where: {
      professoraId,
      data: { gte: rangeGte, lt: rangeLt },
      status: { not: "CANCELADA" },
      id: { not: id },
    },
    select: { horaInicio: true, horaFim: true, aluno: { select: { nome: true } } },
  });
  const conflito = aulasNoDia.find(
    (a) => a.horaInicio && a.horaFim &&
           (horaInicio as string) < a.horaFim &&
           (horaFim as string) > a.horaInicio,
  );
  if (conflito) {
    return NextResponse.json(
      { erro: `Conflito: já existe aula de ${(conflito as any).aluno.nome} das ${conflito.horaInicio} às ${conflito.horaFim}.` },
      { status: 409 },
    );
  }

  // Nenhuma matéria marcada = "todas as matérias" do aluno — igual à criação normal
  let materiaIds: string[] = Array.isArray(materiaIdsBody) ? materiaIdsBody : [];
  if (materiaIds.length === 0) {
    const alunoMaterias = await prisma.aluno.findUnique({
      where: { id: alunoId },
      select: { materias: { select: { materiaId: true } } },
    });
    materiaIds = alunoMaterias?.materias.map((m) => m.materiaId) ?? [];
  }

  const dataOriginalFmt = aulaOriginal.data.toISOString().split("T")[0];
  const horarioOriginal = aulaOriginal.horaInicio && aulaOriginal.horaFim
    ? ` ${aulaOriginal.horaInicio}–${aulaOriginal.horaFim}`
    : "";

  const resultado = await prisma.$transaction(async (tx) => {
    const aulaReposicao = await tx.agendaAula.create({
      data: {
        empresaId: scope.empresaId,
        professoraId,
        alunoId,
        materiaId: materiaIds[0] ?? null,
        data: dataObj,
        horaInicio,
        horaFim,
        observacao: observacao || `Reposição da aula de ${fmtBr(dataOriginalFmt)}${horarioOriginal}.`,
        reposicao: true,
        materias: materiaIds.length > 0
          ? { create: materiaIds.map((mid) => ({ materiaId: mid })) }
          : undefined,
      },
      include: {
        aluno: { select: { id: true, nome: true, serie: true, turma: true } },
        materia: { select: { id: true, nome: true, cor: true } },
        materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
      },
    });

    // Sempre cria um pagamento manual pra aula excluída — valorCobranca é o
    // valor por aula independente do tipoCobranca (que só define a
    // periodicidade da cobrança normal: mensal/quinzenal/semanal/por aula).
    const dataOriginal = aulaOriginal.data;
    const mes = dataOriginal.getUTCMonth() + 1;
    const ano = dataOriginal.getUTCFullYear();

    const agg = await tx.pagamento.aggregate({
      where: { alunoId, mes, ano },
      _max: { parcela: true },
    });
    const parcela = (agg._max.parcela ?? 0) + 1;

    const pagamentoCriado = await tx.pagamento.create({
      data: {
        empresaId: scope.empresaId,
        alunoId,
        mes, ano, parcela,
        dataVencimento: dataOriginal,
        valorCobrado: aulaOriginal.aluno.valorCobranca ?? 0,
        quantidadeAulas: 1,
        pago: false,
        origemManual: true,
        origemReposicao: true,
        observacao: `Cobrança referente à aula de ${fmtBr(dataOriginalFmt)}${horarioOriginal} (remarcada para ${fmtBr(data as string)} ${horaInicio}–${horaFim}).`,
      },
    });

    // Se a aula original estava REALIZADA, exclui o conteúdo vinculado (paridade com DELETE simples)
    if (aulaOriginal.status === "REALIZADA") {
      await tx.conteudo.deleteMany({ where: { aulaId: id } });
    }

    // Exclui o(s) pagamento(s) automáticos vinculados à aula original, igual
    // ao Conteúdo — a cobrança da reposição já foi criada manualmente acima.
    // O guard no início da rota já bloqueou se algum estivesse pago. Busca os
    // vínculos ANTES de excluir a aula, porque a exclusão em cascata apaga a
    // linha de vínculo junto.
    const vinculos = await tx.pagamentoAula.findMany({
      where: { agendaAulaId: id },
      select: { pagamentoId: true },
    });
    const pagamentoIds = [...new Set(vinculos.map((v) => v.pagamentoId))];

    await tx.agendaAula.delete({ where: { id } });

    if (pagamentoIds.length > 0) {
      await tx.pagamento.deleteMany({ where: { id: { in: pagamentoIds } } });
    }

    return { aulaReposicao, pagamentoCriado };
  });

  return NextResponse.json(
    {
      aula: resultado.aulaReposicao,
      pagamento: resultado.pagamentoCriado
        ? { ...resultado.pagamentoCriado, valorCobrado: Number(resultado.pagamentoCriado.valorCobrado) }
        : null,
    },
    { status: 201 },
  );
}

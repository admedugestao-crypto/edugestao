import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { validarAulaParaMinistrado } from "@/lib/conteudoAgenda";
import { gerarPagamentoAula, type ParcelaGerada } from "@/lib/motorCobranca";
import { enviarNotificacaoConteudoMinistrado } from "@/lib/notificacoes";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  // aulaId: usuário resolveu manualmente uma ambiguidade (aluno com +1 aula
  // candidata no dia) escolhendo qual aula vincular.
  const aulaIdEscolhido: string | null = body?.aulaId || null;

  const conteudo = await prisma.conteudo.findUnique({
    where: { id },
    select: {
      id: true, empresaId: true, alunoId: true, data: true, planejado: true, materiaId: true, aulaId: true,
      materia: { select: { nome: true } },
      materias: { select: { materiaId: true } },
    },
  });

  if (!conteudo || conteudo.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Conteúdo não encontrado." }, { status: 404 });
  }
  if (!conteudo.planejado) return NextResponse.json({ erro: "Conteúdo já está Ministrado." }, { status: 422 });

  // Prioriza o vínculo exato (aulaId gravado, ou escolhido manualmente pelo
  // usuário) — só cai para a busca por aluno+data (materia-aware, segura
  // contra ambiguidade) quando nenhum dos dois está disponível.
  const conteudoMateriaIds = conteudo.materias.map((m) => m.materiaId);

  const resultado = await validarAulaParaMinistrado({
    empresaId: scope.empresaId,
    alunoId: conteudo.alunoId,
    data: conteudo.data,
    materiaIds: conteudoMateriaIds,
    aulaId: conteudo.aulaId || aulaIdEscolhido,
    conteudoIdExcluir: conteudo.id,
  });
  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro, candidatas: resultado.candidatas }, { status: 422 });
  }
  const { aula } = resultado;

  // Marca a agenda como REALIZADA, o conteúdo como Ministrado, e grava o vínculo exato
  await prisma.$transaction([
    prisma.agendaAula.update({
      where: { id: aula.id },
      data: { status: "REALIZADA" },
    }),
    prisma.conteudo.update({
      where: { id: conteudo.id },
      data: { planejado: false, aulaId: aula.id },
    }),
  ]);

  // Gera/atualiza a cobrança na hora — uma falha aqui não derruba a resposta,
  // já que o conteúdo e o status já foram salvos com sucesso.
  let avisoPagamento: string | undefined;
  let pagamentoGerado: ParcelaGerada | undefined;
  try {
    const resultado = await gerarPagamentoAula(scope.empresaId, aula.id);
    if (!resultado.semCobranca) pagamentoGerado = resultado.parcela;
  } catch (e) {
    console.error("Falha ao gerar pagamento automático:", e);
    avisoPagamento = "Ministrado salvo, mas não foi possível gerar a cobrança automaticamente.";
  }

  // Best-effort: o conteúdo já foi marcado como Ministrado independente do
  // e-mail dar certo ou não — falha aqui não deve derrubar a resposta.
  try {
    await enviarNotificacaoConteudoMinistrado(conteudo.id);
  } catch (err) {
    console.error(`[ConteudoMinistrado] Falha ao notificar responsável (conteudo ${conteudo.id}):`, err);
  }

  return NextResponse.json({ ok: true, pagamentoGerado, avisoPagamento });
}

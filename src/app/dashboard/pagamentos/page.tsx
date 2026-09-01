import { redirect } from "next/navigation";
import type { PagamentoWhereInput } from "@/generated/prisma/models/Pagamento";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { DollarSign } from "lucide-react";
import PagamentosClient from "@/components/PagamentosClient";

export const dynamic = "force-dynamic";

/** Busca registros reais do mês ou o histórico completo de um aluno. */
async function buscarPagamentos(
  empresaId: string,
  mes: number, ano: number,
  professoraId: string | null,
  alunoFiltro: string | null,
  isAdmin: boolean,
) {
  const where: PagamentoWhereInput = { empresaId };
  if (alunoFiltro) {
    where.alunoId = alunoFiltro;
  } else {
    where.mes = mes;
    where.ano = ano;
  }
  if (!isAdmin && professoraId) where.aluno = { professoraId };

  return prisma.pagamento.findMany({
    where,
    include: {
      aluno: {
        select: {
          id:               true,
          nome:             true,
          tipoCobranca:     true,
          valorCobranca:    true,
          responsavel:      true,
          emailResponsavel: true,
          unidade:    { select: { nome: true, escola: { select: { nome: true } } } },
          professora: { select: { usuario: { select: { nome: true } } } },
        },
      },
      aulas: {
        select: {
          agendaAula: {
            select: {
              id:         true,
              data:       true,
              horaInicio: true,
              horaFim:    true,
              status:     true,
              materia:    { select: { nome: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { dataVencimento: alunoFiltro ? "desc" : "asc" },
      { aluno: { nome: "asc" } },
      { parcela: "asc" },
    ],
  });
}

function serializarPagamentos(pagamentos: Awaited<ReturnType<typeof buscarPagamentos>>) {
  return pagamentos.map((p) => ({
    id:              p.id,
    alunoId:         p.alunoId,
    mes:             p.mes,
    ano:             p.ano,
    parcela:         p.parcela,
    dataVencimento:  p.dataVencimento.toISOString(),
    valorCobrado:    Number(p.valorCobrado),
    quantidadeAulas: p.quantidadeAulas,
    pago:            p.pago,
    dataPagamento:   p.dataPagamento?.toISOString() ?? null,
    observacao:      p.observacao ?? null,
    origemManual:    p.origemManual,
    origemReposicao: p.origemReposicao,
    emailTipo:       p.emailTipo ?? null,
    emailEnviadoEm:  p.emailEnviadoEm?.toISOString() ?? null,
    aluno: {
      id:               p.aluno.id,
      nome:             p.aluno.nome,
      tipoCobranca:     p.aluno.tipoCobranca ?? "",
      valorCobranca:    p.aluno.valorCobranca != null ? Number(p.aluno.valorCobranca) : 0,
      responsavel:      p.aluno.responsavel ?? null,
      emailResponsavel: p.aluno.emailResponsavel ?? null,
      unidade: {
        nome:   p.aluno.unidade.nome,
        escola: { nome: p.aluno.unidade.escola.nome },
      },
      professora: p.aluno.professora?.usuario?.nome ?? null,
    },
    aulasVinculadas: p.aulas.map((pa) => ({
      id:         pa.agendaAula.id,
      data:       pa.agendaAula.data.toISOString(),
      horaInicio: pa.agendaAula.horaInicio,
      horaFim:    pa.agendaAula.horaFim,
      status:     pa.agendaAula.status,
      materia:    pa.agendaAula.materia?.nome ?? null,
    })),
  }));
}

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>;
}) {
  const scope        = await getSessionScope();
  if (!scope) redirect("/login");
  const professoraId = scope.professoraId;
  const params       = await searchParams;
  const alunoFiltro  = params.aluno ?? null;

  const hoje = new Date();
  const mes  = hoje.getMonth() + 1;
  const ano  = hoje.getFullYear();

  const isAdmin    = scope.isAdmin;
  const pagamentos = await buscarPagamentos(scope.empresaId, mes, ano, professoraId, alunoFiltro, isAdmin);
  const alunoSelecionado = alunoFiltro
    ? await prisma.aluno.findFirst({
        where: {
          id: alunoFiltro,
          empresaId: scope.empresaId,
          ...(!isAdmin && professoraId ? { professoraId } : {}),
        },
        select: { nome: true },
      })
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <DollarSign size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Controle de Pagamentos</h1>
      </div>
      <PagamentosClient
        pagamentosIniciais={serializarPagamentos(pagamentos)}
        mesInicial={mes}
        anoInicial={ano}
        isAdmin={isAdmin}
        podeNovo={isAdmin}
        alunoFiltro={alunoFiltro}
        alunoFiltroNome={alunoSelecionado?.nome ?? null}
      />
    </div>
  );
}

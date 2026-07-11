import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DollarSign } from "lucide-react";
import PagamentosClient from "@/components/PagamentosClient";

export const dynamic = "force-dynamic";

/** Busca registros reais de pagamento do mês */
async function buscarPagamentos(
  mes: number, ano: number,
  professoraId: string | null,
  alunoFiltro: string | null,
  isAdmin: boolean,
) {
  const where: any = { mes, ano };
  if (alunoFiltro)              where.alunoId = alunoFiltro;
  if (!isAdmin && professoraId) where.aluno   = { ...(where.aluno ?? {}), professoraId };

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
    },
    orderBy: [
      { dataVencimento: "asc" },
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
    valorCobrado:    p.valorCobrado,
    quantidadeAulas: p.quantidadeAulas,
    pago:            p.pago,
    dataPagamento:   p.dataPagamento?.toISOString() ?? null,
    observacao:      p.observacao ?? null,
    emailTipo:       p.emailTipo ?? null,
    emailEnviadoEm:  p.emailEnviadoEm?.toISOString() ?? null,
    aluno: {
      id:               p.aluno.id,
      nome:             p.aluno.nome,
      tipoCobranca:     p.aluno.tipoCobranca ?? "",
      valorCobranca:    p.aluno.valorCobranca ?? 0,
      responsavel:      p.aluno.responsavel ?? null,
      emailResponsavel: p.aluno.emailResponsavel ?? null,
      unidade: {
        nome:   p.aluno.unidade.nome,
        escola: { nome: p.aluno.unidade.escola.nome },
      },
      professora: p.aluno.professora?.usuario?.nome ?? null,
    },
  }));
}

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>;
}) {
  const session      = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;
  const perfil       = (session?.user as any)?.perfil as string;
  const params       = await searchParams;
  const alunoFiltro  = params.aluno ?? null;

  const hoje = new Date();
  const mes  = hoje.getMonth() + 1;
  const ano  = hoje.getFullYear();

  const isAdmin    = perfil === "SUPERADMIN";
  const pagamentos = await buscarPagamentos(mes, ano, professoraId, alunoFiltro, isAdmin);

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
        isAdmin={perfil === "SUPERADMIN"}
        podeNovo={true}
        alunoFiltro={alunoFiltro}
      />
    </div>
  );
}

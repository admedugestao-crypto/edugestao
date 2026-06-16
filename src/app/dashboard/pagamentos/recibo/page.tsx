import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import ReciboClient from "./ReciboClient";

export const dynamic = "force-dynamic";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TIPO_LABEL: Record<string, string> = {
  MENSAL: "Mensal", QUINZENAL: "Quinzenal", SEMANAL: "Semanal", POR_AULA: "Por aula",
};

function fmtData(d: Date | string | null) {
  if (!d) return "—";
  const iso = d instanceof Date ? d.toISOString() : d;
  const [y, m, day] = iso.split("T")[0].split("-").map(Number);
  return `${String(day).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
}

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ReciboPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const session = await auth();
  if (!session) notFound();

  const { ids } = await searchParams;
  if (!ids) notFound();

  const idList = ids.split(",").filter(Boolean);
  if (idList.length === 0) notFound();

  const pagamentos = await prisma.pagamento.findMany({
    where: { id: { in: idList } },
    include: {
      aluno: {
        include: {
          unidade: { include: { escola: true } },
          professora: { include: { usuario: { select: { nome: true } } } },
        },
      },
    },
    orderBy: [{ aluno: { nome: "asc" } }, { mes: "asc" }, { parcela: "asc" }],
  });

  if (pagamentos.length === 0) notFound();

  const total = pagamentos.reduce((s, p) => s + p.valorCobrado, 0);

  const emissao = fmtData(new Date().toISOString());

  const itens = pagamentos.map((p) => ({
    id:             p.id,
    aluno:          p.aluno.nome,
    escola:         p.aluno.unidade.escola.nome,
    unidade:        p.aluno.unidade.nome,
    professora:     p.aluno.professora?.usuario?.nome ?? null,
    competencia:    `${MESES[p.mes - 1]} / ${p.ano}`,
    tipo:           TIPO_LABEL[p.aluno.tipoCobranca ?? ""] ?? (p.aluno.tipoCobranca ?? ""),
    parcela:        p.parcela,
    qtdAulas:       p.quantidadeAulas,
    valorCobrado:   moeda(p.valorCobrado),
    vencimento:     fmtData(p.dataVencimento),
    pago:           p.pago,
    dataPagamento:  fmtData(p.dataPagamento),
    observacao:     p.observacao ?? null,
  }));

  return <ReciboClient itens={itens} total={moeda(total)} emissao={emissao} />;
}

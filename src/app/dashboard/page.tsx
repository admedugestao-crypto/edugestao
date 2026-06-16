import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, School, ClipboardList, AlertCircle, CalendarClock, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function parseDataLocal(iso: Date | string) {
  const str = iso instanceof Date ? iso.toISOString() : iso;
  const [y, m, d] = str.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardPage() {
  const session = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;

  const filtroAluno = professoraId ? { professoraId } : {};

  const agora    = new Date();
  const mesAtual = agora.getUTCMonth() + 1;
  const anoAtual = agora.getUTCFullYear();

  const [totalAlunos, todasNotas, proximasProvas, pagamentosMes] =
    await Promise.all([
      prisma.aluno.count({ where: { ...filtroAluno, status: "ATIVO" } }),
      prisma.nota.findMany({
        where: { aluno: filtroAluno },
        include: {
          aluno: { select: { nome: true } },
          materia: true,
          avaliacao: { select: { notaMax: true } },
        },
        orderBy: { criadoEm: "desc" },
      }),
      prisma.avaliacao.findMany({
        where: {
          data: { gte: new Date() },
          ...(professoraId ? { unidade: { alunos: { some: { professoraId, status: "ATIVO" } } } } : {}),
        },
        include: { unidade: { include: { escola: true } }, materia: true },
        orderBy: { data: "asc" },
        take: 6,
      }),
      prisma.pagamento.findMany({
        where: {
          mes: mesAtual,
          ano: anoAtual,
          ...(professoraId ? { aluno: { professoraId } } : {}),
        },
        select: { valorCobrado: true, pago: true, dataVencimento: true },
      }),
    ]);

  const alunosBaixoDesempenho = todasNotas
    .filter((n) => n.valor < n.avaliacao.notaMax / 2)
    .slice(0, 5);

  const totalEscolas  = await prisma.escola.count();
  const totalEsperado = pagamentosMes.reduce((s, p) => s + p.valorCobrado, 0);
  const totalRecebido = pagamentosMes.filter((p) => p.pago).reduce((s, p) => s + p.valorCobrado, 0);
  const totalPendente = totalEsperado - totalRecebido;

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const qtdAtrasados = pagamentosMes.filter((p) => {
    if (p.pago) return false;
    const [y, m, d] = p.dataVencimento.toISOString().split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d + 1) < hoje;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Bem-vinda, {session?.user?.name}</p>
      </div>

      {/* Cards gerais */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="inline-flex p-2 rounded-lg bg-indigo-50 text-indigo-600 mb-3">
            <Users size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalAlunos}</p>
          <p className="text-sm text-slate-500 mt-0.5">Alunos ativos</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="inline-flex p-2 rounded-lg bg-emerald-50 text-emerald-600 mb-3">
            <School size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalEscolas}</p>
          <p className="text-sm text-slate-500 mt-0.5">Escolas cadastradas</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="inline-flex p-2 rounded-lg bg-rose-50 text-rose-600 mb-3">
            <ClipboardList size={20} />
          </div>
          <p className="text-2xl font-bold text-slate-800">{todasNotas.length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Notas lançadas</p>
        </div>
      </div>

      {/* Resumo financeiro do mês — igual à tela de Pagamentos */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-amber-500" />
          <h2 className="font-semibold text-slate-700 text-sm">
            Financeiro — {MESES[mesAtual - 1]} {anoAtual}
          </h2>
          <Link href="/dashboard/pagamentos" className="ml-auto text-xs text-indigo-500 hover:underline">
            Ver detalhes →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-slate-500" />
              <p className="text-xs font-medium text-slate-500">Total esperado</p>
            </div>
            <p className="text-lg font-bold text-slate-800">{moeda(totalEsperado)}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <p className="text-xs font-medium text-emerald-600">Recebido</p>
            </div>
            <p className="text-lg font-bold text-emerald-700">{moeda(totalRecebido)}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-amber-500" />
              <p className="text-xs font-medium text-amber-600">Pendente</p>
            </div>
            <p className="text-lg font-bold text-amber-700">{moeda(totalPendente)}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-xs font-medium text-red-600">Atrasados</p>
            </div>
            <p className="text-lg font-bold text-red-700">{qtdAtrasados}</p>
          </div>
        </div>
      </div>

      {/* Próximas provas + Atenção necessária */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Próximas provas</h2>
          </div>
          {proximasProvas.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma prova agendada.</p>
          ) : (
            <ul className="space-y-2">
              {proximasProvas.map((av) => (
                <li key={av.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">{av.nome}</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {av.unidade.escola.nome} · {av.serie}
                      {av.materia && <> · <span className="text-indigo-500">{av.materia.nome}</span></>}
                      {av.periodo && <> · <span className="text-slate-500">{av.periodo}</span></>}
                    </p>
                  </div>
                  <span className="text-indigo-600 font-medium whitespace-nowrap">
                    {format(parseDataLocal(av.data), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-rose-500" />
            <h2 className="font-semibold text-slate-800">Atenção necessária</h2>
          </div>
          {alunosBaixoDesempenho.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum aluno abaixo da média.</p>
          ) : (
            <ul className="space-y-2">
              {alunosBaixoDesempenho.map((n) => (
                <li key={n.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-slate-700">{n.aluno.nome}</span>
                    <span className="text-slate-500 ml-2">{n.materia.nome}</span>
                  </div>
                  <span className="text-rose-600 font-bold">{n.valor.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard/alunos/novo"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Cadastrar aluno
        </Link>
        <Link
          href="/dashboard/notas"
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Lançar notas
        </Link>
      </div>
    </div>
  );
}

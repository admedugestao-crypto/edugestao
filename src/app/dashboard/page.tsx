import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isMobileUserAgent } from "@/lib/device";
import { Users, School, DollarSign, ClipboardList, AlertCircle, CalendarClock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

function parseDataLocal(iso: Date | string) {
  const str = iso instanceof Date ? iso.toISOString() : iso;
  const [y, m, d] = str.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default async function DashboardPage() {
  // Acesso direto a /dashboard (favorito/link antigo) num celular → versão mobile
  const ua = (await headers()).get("user-agent");
  if (isMobileUserAgent(ua)) redirect("/m");

  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const session = await auth();
  const professoraId = scope.professoraId;
  const isAdmin      = scope.isAdmin;

  const [totalAlunos, todasNotas, proximasProvas, pagamentosAbertos, totalEscolas] =
    await Promise.all([
      prisma.aluno.count({ where: { ...scopeWhere(scope), status: "ATIVO" } }),
      prisma.nota.findMany({
        where: {
          empresaId: scope.empresaId,
          ...(!isAdmin ? { aluno: { professoraId } } : {}),
        },
        include: {
          aluno: { select: { nome: true } },
          materia: true,
          avaliacao: { select: { nome: true, notaMax: true } },
        },
        orderBy: { criadoEm: "desc" },
      }),
      isAdmin ? Promise.resolve([]) : prisma.avaliacao.findMany({
        where: {
          empresaId: scope.empresaId,
          data: { gte: new Date() },
          ...(professoraId ? { unidade: { alunos: { some: { professoraId, status: "ATIVO" } } } } : {}),
        },
        include: { unidade: { include: { escola: true } }, materia: true },
        orderBy: { data: "asc" },
        take: 6,
      }),
      prisma.pagamento.findMany({
        where: {
          empresaId: scope.empresaId,
          pago: false,
          ...(professoraId ? { aluno: { professoraId } } : {}),
        },
        select: { valorCobrado: true },
      }),
      prisma.escola.count({ where: { empresaId: scope.empresaId } }),
    ]);

  // Mantém o critério já adotado pelo sistema: nota inferior a 50% da nota
  // máxima da avaliação. A contagem é por aluno, sem duplicar quem teve mais
  // de uma nota baixa; a lista mostra os lançamentos mais recentes.
  const notasBaixas = todasNotas.filter((n) => n.valor < n.avaliacao.notaMax / 2);
  const totalAlunosComNotaBaixa = new Set(notasBaixas.map((n) => n.alunoId)).size;
  const notasBaixasRecentes = notasBaixas;

  const totalPendente = pagamentosAbertos.reduce((s, p) => s + Number(p.valorCobrado), 0);

  function formatBRL(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const cards = [
    { label: "Alunos ativos",       valor: totalAlunos,           icon: Users,         cor: "bg-indigo-50 text-indigo-600",  link: "/dashboard/alunos" },
    { label: "Escolas cadastradas", valor: totalEscolas,           icon: School,        cor: "bg-emerald-50 text-emerald-600", link: "/dashboard/escolas" },
    { label: "A receber (em aberto)", valor: formatBRL(totalPendente), icon: DollarSign, cor: "bg-amber-50 text-amber-600", link: "/dashboard/pagamentos" },
    { label: "Alunos com notas baixas", valor: totalAlunosComNotaBaixa, icon: ClipboardList, cor: "bg-rose-50 text-rose-600", link: "/dashboard/notas" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Bem-vinda, {session?.user?.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`inline-flex p-2 rounded-lg ${c.cor} mb-3`}>
              <c.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.valor}</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-sm text-slate-500">{c.label}</p>
              {"link" in c && (
                <Link href={c.link!} className="text-xs text-indigo-500 hover:underline">
                  Detalhes →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-6 ${!isAdmin ? "lg:grid-cols-2" : ""}`}>
          {!isAdmin && <div className="bg-white rounded-xl border border-slate-200 p-5">
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
          </div>}

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={18} className="text-rose-500" />
              <h2 className="font-semibold text-slate-800">Atenção necessária</h2>
            </div>
            {notasBaixasRecentes.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum aluno abaixo da média.</p>
            ) : (
              <>
                <ul className="space-y-2 max-h-52 overflow-y-auto pr-2 overscroll-contain">
                {notasBaixasRecentes.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">{n.aluno.nome}</span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {n.materia.nome} · {n.avaliacao.nome}
                      </p>
                    </div>
                    <span className="text-rose-600 font-bold whitespace-nowrap">
                      {n.valor.toFixed(1)} / {n.avaliacao.notaMax.toFixed(1)}
                    </span>
                  </li>
                ))}
                </ul>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Critério: abaixo de 50% da nota máxima.
                  </p>
                  <Link href="/dashboard/notas" className="text-xs text-indigo-600 hover:underline">
                    Ver notas →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
    </div>
  );
}

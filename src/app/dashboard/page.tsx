import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, School, BookOpen, ClipboardList, AlertCircle, CalendarClock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function parseDataLocal(iso: Date | string) {
  const str = iso instanceof Date ? iso.toISOString() : iso;
  const [y, m, d] = str.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default async function DashboardPage() {
  const session = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;

  const filtroAluno = professoraId ? { professoraId } : {};

  const [totalAlunos, todasNotas, proximasProvas] =
    await Promise.all([
      prisma.aluno.count({
        where: { ...filtroAluno, status: "ATIVO" },
      }),
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
          ...(professoraId
            ? {
                unidade: {
                  alunos: { some: { professoraId, status: "ATIVO" } },
                },
              }
            : {}),
        },
        include: { unidade: { include: { escola: true } }, materia: true },
        orderBy: { data: "asc" },
        take: 6,
      }),
    ]);

  // Apenas notas abaixo da média da avaliação (valor < notaMax / 2)
  const alunosBaixoDesempenho = todasNotas
    .filter((n) => n.valor < n.avaliacao.notaMax / 2)
    .slice(0, 5);

  const totalEscolas = await prisma.escola.count();
  const totalMaterias = professoraId
    ? await prisma.professoraMateria.count({ where: { professoraId } })
    : 0;

  const cards = [
    { label: "Alunos ativos", valor: totalAlunos, icon: Users, cor: "bg-indigo-50 text-indigo-600" },
    { label: "Escolas cadastradas", valor: totalEscolas, icon: School, cor: "bg-emerald-50 text-emerald-600" },
    { label: "Disciplinas", valor: totalMaterias, icon: BookOpen, cor: "bg-amber-50 text-amber-600" },
    { label: "Notas lançadas", valor: todasNotas.length, icon: ClipboardList, cor: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Bem-vinda, {session?.user?.name}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`inline-flex p-2 rounded-lg ${c.cor} mb-3`}>
              <c.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.valor}</p>
            <p className="text-sm text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

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

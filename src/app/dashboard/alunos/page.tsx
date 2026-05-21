import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, Plus, Search } from "lucide-react";
import AlunosTabela from "@/components/AlunosTabela";

export const dynamic = "force-dynamic";

const CAMPOS = [
  { value: "nome",        label: "Nome" },
  { value: "serie",       label: "Série" },
  { value: "turma",       label: "Turma" },
  { value: "escola",      label: "Escola" },
  { value: "responsavel", label: "Responsável" },
  { value: "disciplina",  label: "Disciplina" },
] as const;

type Campo = (typeof CAMPOS)[number]["value"];

function filtroWhere(campo: Campo, q: string) {
  if (!q) return {};
  switch (campo) {
    case "nome":        return { nome: { contains: q } };
    case "serie":       return { serie: { contains: q } };
    case "turma":       return { turma: { contains: q } };
    case "escola":      return { unidade: { escola: { nome: { contains: q } } } };
    case "responsavel": return { responsavel: { contains: q } };
    case "disciplina":  return { materias: { some: { materia: { nome: { contains: q } } } } };
    default:            return {};
  }
}

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; campo?: string }>;
}) {
  noStore(); // desabilita completamente qualquer cache Next.js

  const session = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;
  const perfil = (session?.user as any)?.perfil as string | undefined;
  const isAdmin = perfil === "SUPERADMIN";
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "ATIVO";
  const campo = (params.campo ?? "nome") as Campo;

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  let alunos: any[] = [];
  try {
    alunos = await prisma.aluno.findMany({
      where: {
        ...(!isAdmin && professoraId ? { professoraId } : {}),
        status: status as any,
        ...filtroWhere(campo, q),
      },
      include: {
        unidade: { include: { escola: true } },
        materias: { include: { materia: true } },
        pagamentos: { where: { mes: mesAtual, ano: anoAtual } },
        ...(isAdmin ? { professora: { include: { usuario: { select: { nome: true } } } } } : {}),
      },
      orderBy: { nome: "asc" },
    });
    console.log("[alunos] encontrados:", alunos.length, "| status filter:", status);
  } catch (err: any) {
    console.error("[alunos] ERRO na query:", err?.message ?? err);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">Alunos</h1>
          <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {alunos.length}
          </span>
        </div>
        <Link
          href="/dashboard/alunos/novo"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Novo aluno
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex gap-3 flex-wrap mb-4">
          <form method="GET" className="flex gap-2 flex-1 min-w-48 flex-wrap">
            <select
              name="campo"
              defaultValue={campo}
              className="text-sm border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
            >
              {CAMPOS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div className="relative flex-1 min-w-32">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder={`Buscar por ${CAMPOS.find(c => c.value === campo)?.label.toLowerCase() ?? "nome"}...`}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-3 py-2 rounded-lg transition-colors"
            >
              Buscar
            </button>
          </form>

          <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
            {(["ATIVO", "PAUSADO", "ENCERRADO"] as const).map((s) => (
              <Link
                key={s}
                href={`/dashboard/alunos?status=${s}&q=${q}&campo=${campo}`}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  status === s
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s === "ATIVO" ? "Ativos" : s === "PAUSADO" ? "Pausados" : "Encerrados"}
              </Link>
            ))}
          </div>
        </div>

        <AlunosTabela alunos={alunos as any} isAdmin={isAdmin} mes={mesAtual} ano={anoAtual} />
      </div>
    </div>
  );
}

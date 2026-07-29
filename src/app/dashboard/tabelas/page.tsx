import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionScope } from "@/lib/tenant";
import { Table2, ListChecks, ClipboardList, ChevronRight } from "lucide-react";

const tabelas = [
  {
    href: "/dashboard/tabelas/metodos-ensino",
    titulo: "Métodos de Ensino",
    descricao: "Lista de métodos usada nos materiais da Biblioteca.",
    icon: ListChecks,
  },
  {
    href: "/dashboard/tabelas/tipos-avaliacao",
    titulo: "Tipos de Avaliação",
    descricao: "Lista de tipos usada no campo \"Tipo\" do Calendário de Provas.",
    icon: ClipboardList,
  },
];

export default async function TabelasPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Table2 size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Tabelas</h1>
      </div>
      <p className="text-slate-500 text-sm -mt-3">
        Cadastros auxiliares usados em outras telas do sistema.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tabelas.map(({ href, titulo, descricao, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{titulo}</p>
              <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { ListChecks } from "lucide-react";
import MetodosEnsinoClient from "@/components/MetodosEnsinoClient";

export const dynamic = "force-dynamic";

export default async function MetodosEnsinoPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const metodos = await prisma.metodoEnsino.findMany({
    where: { empresaId: scope.empresaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ListChecks size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Métodos de Ensino</h1>
      </div>
      <p className="text-slate-500 text-sm -mt-3">
        Essa lista aparece como opção no campo "Método" ao cadastrar materiais na Biblioteca.
      </p>
      <MetodosEnsinoClient metodosIniciais={metodos} />
    </div>
  );
}

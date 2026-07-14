import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { Library } from "lucide-react";
import BibliotecaClient from "@/components/BibliotecaClient";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const [materiais, materias] = await Promise.all([
    prisma.materialBiblioteca.findMany({
      where: { empresaId: scope.empresaId },
      include: { materia: true },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Library size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Biblioteca</h1>
        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
          {materiais.length}
        </span>
      </div>
      <BibliotecaClient materiaisIniciais={materiais} materias={materias} />
    </div>
  );
}

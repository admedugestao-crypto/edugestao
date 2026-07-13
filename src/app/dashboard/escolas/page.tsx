import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { School, Plus, MapPin } from "lucide-react";
import EscolasClient from "@/components/EscolasClient";

export const dynamic = "force-dynamic";

export default async function EscolasPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const escolas = await prisma.escola.findMany({
    where: { empresaId: scope.empresaId },
    include: { unidades: { orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });

  const escolasSerial = escolas.map((e) => ({
    ...e,
    periodoLetivo1Inicio: e.periodoLetivo1Inicio?.toISOString() ?? null,
    periodoLetivo1Fim: e.periodoLetivo1Fim?.toISOString() ?? null,
    periodoLetivo2Inicio: e.periodoLetivo2Inicio?.toISOString() ?? null,
    periodoLetivo2Fim: e.periodoLetivo2Fim?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <School size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">Escolas</h1>
          <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {escolas.length}
          </span>
        </div>
      </div>

      <EscolasClient escolasIniciais={escolasSerial} />
    </div>
  );
}

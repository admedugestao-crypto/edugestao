import { prisma } from "@/lib/prisma";
import { School, Plus, MapPin } from "lucide-react";
import EscolasClient from "@/components/EscolasClient";

export default async function EscolasPage() {
  const escolas = await prisma.escola.findMany({
    include: { unidades: { orderBy: { nome: "asc" } } },
    orderBy: { nome: "asc" },
  });

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

      <EscolasClient escolasIniciais={escolas} />
    </div>
  );
}

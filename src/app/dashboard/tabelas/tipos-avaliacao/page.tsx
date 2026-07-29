import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { ClipboardList } from "lucide-react";
import TiposAvaliacaoClient from "@/components/TiposAvaliacaoClient";

export const dynamic = "force-dynamic";

export default async function TiposAvaliacaoPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const tipos = await prisma.tipoAvaliacao.findMany({
    where: { empresaId: scope.empresaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardList size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Tipos de Avaliação</h1>
      </div>
      <p className="text-slate-500 text-sm -mt-3">
        Essa lista aparece como opção no campo "Tipo" ao cadastrar uma avaliação no Calendário de Provas.
      </p>
      <TiposAvaliacaoClient tiposIniciais={tipos} />
    </div>
  );
}

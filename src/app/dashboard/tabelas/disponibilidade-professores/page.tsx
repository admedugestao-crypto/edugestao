import { redirect } from "next/navigation";
import { Clock3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import DisponibilidadeProfessoresClient from "@/components/DisponibilidadeProfessoresClient";

export const dynamic = "force-dynamic";

export default async function DisponibilidadeProfessoresPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  if (!scope.isAdmin) redirect("/dashboard/tabelas");

  const professoras = await prisma.professora.findMany({
    where: { empresaId: scope.empresaId, usuario: { ativo: true } },
    orderBy: { usuario: { nome: "asc" } },
    select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Clock3 size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Disponibilidade dos Professores</h1>
      </div>
      <p className="text-slate-500 text-sm -mt-3">
        Defina os dias e horários usados na geração e na validação da agenda.
      </p>
      <DisponibilidadeProfessoresClient professorasIniciais={professoras.map((p) => ({
        id: p.id,
        nome: p.usuario.nome,
        disponibilidade: Array.isArray(p.disponibilidade) ? p.disponibilidade as { dia: string; inicio: string; fim: string }[] : [],
      }))} />
    </div>
  );
}

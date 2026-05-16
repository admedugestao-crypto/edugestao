import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen } from "lucide-react";
import DisciplinasClient from "@/components/DisciplinasClient";

export default async function DisciplinasPage() {
  const session = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;

  const [todasMaterias, minhasMaterias] = await Promise.all([
    prisma.materia.findMany({ orderBy: { nome: "asc" } }),
    professoraId
      ? prisma.professoraMateria.findMany({ where: { professoraId }, select: { materiaId: true } })
      : Promise.resolve([]),
  ]);

  const minhasIds = minhasMaterias.map((m) => m.materiaId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BookOpen size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Disciplinas</h1>
      </div>
      <p className="text-slate-500 text-sm -mt-3">
        Selecione as disciplinas que você leciona e cadastre novas se necessário.
      </p>
      <DisciplinasClient
        todasMaterias={todasMaterias}
        minhasIdsIniciais={minhasIds}
        professoraId={professoraId ?? ""}
      />
    </div>
  );
}

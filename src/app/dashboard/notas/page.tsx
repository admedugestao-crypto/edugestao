import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { ClipboardList } from "lucide-react";
import NotasClient from "@/components/NotasClient";

export const dynamic = "force-dynamic";

export default async function NotasPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const notaWhere: any = { empresaId: scope.empresaId };
  if (!scope.isAdmin && scope.professoraId) notaWhere.aluno = { professoraId: scope.professoraId };

  const [alunos, avaliacoes, notas] = await Promise.all([
    prisma.aluno.findMany({
      where: { ...scopeWhere(scope), status: "ATIVO" },
      include: {
        materias: { include: { materia: true } },
        unidade: { include: { escola: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.avaliacao.findMany({
      where: { empresaId: scope.empresaId },
      include: { unidade: { include: { escola: true } } },
      orderBy: { data: "asc" },
    }),
    prisma.nota.findMany({
      where: notaWhere,
      include: { avaliacao: true, materia: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardList size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Notas</h1>
      </div>
      <NotasClient
        alunos={alunos as any}
        avaliacoes={avaliacoes.map((a) => ({ ...a, data: a.data.toISOString() })) as any}
        notasIniciais={notas as any}
      />
    </div>
  );
}

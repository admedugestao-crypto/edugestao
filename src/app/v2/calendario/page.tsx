import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import BoletimPeriodo from "@/components/BoletimPeriodo";

export const dynamic = "force-dynamic";

export default async function CalendarioV2Page() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login?callbackUrl=/v2/calendario");
  const alunos = (!scope.isAdmin && !scope.professoraId) ? [] : await prisma.aluno.findMany({
    where: { empresaId: scope.empresaId, status: "ATIVO", ...(!scope.isAdmin ? { professoraId: scope.professoraId } : {}) },
    select: { id: true, nome: true, serie: true, turma: true, unidade: { select: { nome: true, escola: { select: { nome: true, periodoAvaliacao: true } } } }, materias: { select: { materia: { select: { id: true, nome: true } } } } },
    orderBy: { nome: "asc" },
  });
  return <div className="p-4 md:p-8"><BoletimPeriodo alunos={alunos} anoInicial={new Date().getFullYear()} /></div>;
}

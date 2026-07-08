import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { CalendarDays } from "lucide-react";
import AgendaClient from "@/components/AgendaClient";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const professoraId = scope.professoraId;
  const isAdmin      = scope.isAdmin;
  const isProfessor  = !isAdmin && !!professoraId;

  // Busca alunos ativos (filtrado por professor se for professora, admin vê todos)
  const alunos = await prisma.aluno.findMany({
    where: { ...scopeWhere(scope), status: "ATIVO" },
    select: {
      id: true, nome: true, serie: true, turma: true, diaSemana: true,
      professoraId: true,
      materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
    },
    orderBy: { nome: "asc" },
  });

  // Busca matérias
  const materias = isProfessor
    ? await prisma.materia.findMany({
        where: { empresaId: scope.empresaId, professoras: { some: { professoraId: professoraId! } } },
        select: { id: true, nome: true, cor: true },
        orderBy: { nome: "asc" },
      })
    : await prisma.materia.findMany({
        where: { empresaId: scope.empresaId },
        select: { id: true, nome: true, cor: true },
        orderBy: { nome: "asc" },
      });

  // Professoras com disponibilidade (excluir admins)
  const professorasRaw = await prisma.professora.findMany({
    where: { empresaId: scope.empresaId, usuario: { perfil: "PROFESSORA" } },
    select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
    orderBy: { usuario: { nome: "asc" } },
  });

  const disponibilidades = professorasRaw.map((p) => ({
    professoraId: p.id,
    slots: (p.disponibilidade as any) ?? [],
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CalendarDays size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Agenda de Aulas</h1>
      </div>

      <AgendaClient
        alunos={alunos.map((a) => ({
          ...a,
          materias: a.materias.map((m) => m.materia),
        }))}
        materias={materias}
        professoras={professorasRaw.map((p) => ({ id: p.id, nome: p.usuario.nome }))}
        isProfessor={isProfessor}
        disponibilidades={disponibilidades}
        professoraIdSessao={professoraId ?? ""}
      />
    </div>
  );
}

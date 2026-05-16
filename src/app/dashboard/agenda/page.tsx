import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarDays } from "lucide-react";
import AgendaClient from "@/components/AgendaClient";

export default async function AgendaPage() {
  const session      = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;
  const perfil       = (session?.user as any)?.perfil as string;
  const isProfessor  = !!professoraId;

  // Busca alunos ativos (filtrado por professor se for professora)
  const alunos = await prisma.aluno.findMany({
    where: { status: "ATIVO", ...(isProfessor ? { professoraId } : {}) },
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
        where: { professoras: { some: { professoraId: professoraId! } } },
        select: { id: true, nome: true, cor: true },
        orderBy: { nome: "asc" },
      })
    : await prisma.materia.findMany({ select: { id: true, nome: true, cor: true }, orderBy: { nome: "asc" } });

  // Se não for professora, busca lista de professoras para seleção no form
  const professoras = !isProfessor
    ? await prisma.professora.findMany({
        include: { usuario: { select: { nome: true } } },
        orderBy: { usuario: { nome: "asc" } },
      })
    : [];

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
        professoras={professoras.map((p) => ({ id: p.id, nome: p.usuario.nome }))}
        isProfessor={isProfessor}
      />
    </div>
  );
}

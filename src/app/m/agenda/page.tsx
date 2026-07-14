import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { redirect } from "next/navigation";
import AgendaMobile from "@/components/AgendaMobile";

export const dynamic = "force-dynamic";

export default async function AgendaMobilePage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const session      = await auth();
  const isProfessor  = !scope.isAdmin && !!scope.professoraId;
  const nomeUsuario  = (session?.user as any)?.name as string ?? "";

  const professoras = await (prisma.professora.findMany({
    where: { empresaId: scope.empresaId, usuario: { perfil: "PROFESSORA" } },
    select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
    orderBy: { usuario: { nome: "asc" } },
  }) as unknown as Promise<any[]>);

  const disponibilidades = professoras.map((p: any) => ({
    professoraId: p.id,
    slots: (p.disponibilidade as any) ?? [],
  }));

  const alunos = await prisma.aluno.findMany({
    where: scopeWhere(scope, { extra: { status: "ATIVO" } }),
    select: {
      id: true, nome: true, serie: true, turma: true,
      professoraId: true,
      materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
    },
    orderBy: { nome: "asc" },
  });

  return (
    <AgendaMobile
      isProfessor={isProfessor}
      isAdmin={scope.isAdmin}
      nomeUsuario={nomeUsuario}
      professoraIdSessao={scope.professoraId ?? ""}
      professoras={professoras.map((p: any) => ({ id: p.id, nome: p.usuario.nome }))}
      disponibilidades={disponibilidades}
      alunos={alunos.map((a) => ({ ...a, materias: a.materias.map((m) => m.materia) }))}
    />
  );
}

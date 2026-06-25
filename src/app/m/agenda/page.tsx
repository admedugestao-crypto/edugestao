import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AgendaMobile from "@/components/AgendaMobile";

export const dynamic = "force-dynamic";

export default async function AgendaMobilePage() {
  const session    = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;
  const perfil       = (session?.user as any)?.perfil as string;
  const isAdmin      = perfil === "SUPERADMIN";
  const isProfessor  = !isAdmin && !!professoraId;
  const nomeUsuario  = (session?.user as any)?.name as string ?? "";

  const professoras = await (prisma.professora.findMany({
    where: { usuario: { perfil: "PROFESSORA" } },
    select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
    orderBy: { usuario: { nome: "asc" } },
  }) as unknown as Promise<any[]>);

  const disponibilidades = professoras.map((p: any) => ({
    professoraId: p.id,
    slots: (p.disponibilidade as any) ?? [],
  }));

  const alunos = await prisma.aluno.findMany({
    where: { status: "ATIVO", ...(!isAdmin && professoraId ? { professoraId } : {}) },
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
      isAdmin={isAdmin}
      nomeUsuario={nomeUsuario}
      professoraIdSessao={professoraId ?? ""}
      professoras={professoras.map((p: any) => ({ id: p.id, nome: p.usuario.nome }))}
      disponibilidades={disponibilidades}
      alunos={alunos.map((a) => ({ ...a, materias: a.materias.map((m) => m.materia) }))}
    />
  );
}

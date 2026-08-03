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

  // Inclui administradores que também dão aula (têm registro de Professora
  // vinculado, independente do perfil).
  const [professoras, alunos] = await Promise.all([
    prisma.professora.findMany({
      where: { empresaId: scope.empresaId },
      select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
      orderBy: { usuario: { nome: "asc" } },
    }) as unknown as Promise<any[]>,
    prisma.aluno.findMany({
      where: scopeWhere(scope, { extra: { status: "ATIVO" } }),
      select: {
        id: true, nome: true, serie: true, turma: true,
        professoraId: true,
        materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
      },
      orderBy: { nome: "asc" },
    }),
  ]);

  const disponibilidades = professoras.map((p: any) => ({
    professoraId: p.id,
    slots: (p.disponibilidade as any) ?? [],
  }));

  // Provas próximas dos alunos deste professor, para o aviso na agenda mobile
  const provasProximas = isProfessor ? await buscarProvasProximas(scope.empresaId, scope.professoraId!) : [];

  return (
    <AgendaMobile
      isProfessor={isProfessor}
      isAdmin={scope.isAdmin}
      nomeUsuario={nomeUsuario}
      professoraIdSessao={scope.professoraId ?? ""}
      professoras={professoras.map((p: any) => ({ id: p.id, nome: p.usuario.nome }))}
      disponibilidades={disponibilidades}
      alunos={alunos.map((a) => ({ ...a, materias: a.materias.map((m) => m.materia) }))}
      provasProximas={provasProximas}
    />
  );
}

// ── Provas nos próximos 30 dias, nas turmas (unidade+série) deste professor ─
async function buscarProvasProximas(empresaId: string, professoraId: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const em30dias = new Date(hoje); em30dias.setDate(em30dias.getDate() + 30); em30dias.setHours(23, 59, 59, 999);

  const alunosProf = await prisma.aluno.findMany({
    where: { professoraId, status: "ATIVO" },
    select: { unidadeId: true, serie: true },
  });
  const combos = Array.from(new Set(alunosProf.map((a) => `${a.unidadeId}::${a.serie}`)))
    .map((s) => { const [unidadeId, serie] = s.split("::"); return { unidadeId, serie }; });
  if (combos.length === 0) return [];

  const avaliacoes = await prisma.avaliacao.findMany({
    where: { empresaId, data: { gte: hoje, lte: em30dias }, OR: combos },
    select: {
      id: true, nome: true, data: true, serie: true,
      materia: { select: { nome: true, cor: true } },
      unidade: { select: { nome: true, escola: { select: { nome: true } } } },
    },
    orderBy: { data: "asc" },
  });

  return avaliacoes.map((av) => ({
    id: av.id,
    nome: av.nome,
    data: av.data.toISOString(),
    serie: av.serie,
    materiaNome: av.materia?.nome ?? null,
    materiaCor: av.materia?.cor ?? null,
    unidadeNome: av.unidade.nome,
    escolaNome: av.unidade.escola.nome,
  }));
}

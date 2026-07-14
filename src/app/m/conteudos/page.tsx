import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { redirect } from "next/navigation";
import ConteudosMobile from "@/components/ConteudosMobile";

export const dynamic = "force-dynamic";

export default async function ConteudosMobilePage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const session      = await auth();
  const professoraId = scope.professoraId;
  const perfil       = scope.perfil;
  const nomeUsuario  = (session?.user as any)?.name as string ?? "";
  const isAdmin      = perfil !== "PROFESSORA";
  const filtroProf   = (!isAdmin && professoraId) ? { professoraId } : {};

  const [alunos, conteudos, professoras] = await Promise.all([
    prisma.aluno.findMany({
      where: { empresaId: scope.empresaId, ...filtroProf },
      include: { materias: { include: { materia: true } }, professora: { select: { id: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.conteudo.findMany({
      where: { empresaId: scope.empresaId, aluno: filtroProf },
      include: {
        aluno: {
          select: {
            nome: true,
            professora: { select: { usuario: { select: { nome: true } } } },
          },
        },
        materia: true,
        aula: {
          select: {
            id: true, horaInicio: true, horaFim: true, status: true,
            materia: { select: { nome: true, cor: true } },
            aluno: { select: { nome: true } },
          },
        },
      },
      orderBy: { data: "desc" },
      take: 50,
    }),
    prisma.professora.findMany({
      where: { empresaId: scope.empresaId, usuario: { perfil: "PROFESSORA" } },
      include: { usuario: { select: { nome: true } } },
      orderBy: { usuario: { nome: "asc" } },
    }),
  ]);

  return (
    <ConteudosMobile
      nomeUsuario={nomeUsuario}
      isProfessor={!isAdmin}
      alunos={alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        professoraId: a.professoraId ?? null,
        materias: a.materias.map((am) => ({
          materiaId: am.materiaId,
          materia: am.materia,
        })),
      }))}
      professoras={professoras.map((p) => ({ id: p.id, nome: p.usuario.nome }))}
      conteudosIniciais={conteudos.map((c) => ({
        ...c,
        data:      c.data.toISOString(),
        criadoEm:  c.criadoEm.toISOString(),
        aluno: {
          nome:      c.aluno.nome,
          professora: c.aluno.professora?.usuario?.nome ?? null,
        },
        agenda: c.aula ? { id: c.aula.id, horaInicio: c.aula.horaInicio, horaFim: c.aula.horaFim, status: c.aula.status, materia: c.aula.materia, aluno: c.aula.aluno } : null,
      }))}
    />
  );
}

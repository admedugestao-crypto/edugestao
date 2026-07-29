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

  const [alunos, conteudos, professoras, materias] = await Promise.all([
    prisma.aluno.findMany({
      where: { empresaId: scope.empresaId, ...filtroProf },
      include: {
        // Matérias do aluno para fins de Conteúdo vêm das aulas agendadas
        // dele (AgendaAula), não do vínculo direto AlunoMateria — é a agenda
        // que define quais matérias o aluno efetivamente estuda com cada
        // professora. Uma aula pode ter várias matérias (aula multidisciplinar,
        // via AgendaAulaMateria) além da matéria "principal" (materiaId).
        aulas: {
          select: {
            materiaId: true,
            materia: true,
            materias: { select: { materia: true } },
          },
        },
        professora: { select: { id: true } },
        unidade: { select: { escola: { select: { metodoEnsino: { select: { id: true, nome: true } } } } } },
      },
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
    // Inclui administradores que também dão aula (têm registro de Professora
    // vinculado, independente do perfil).
    prisma.professora.findMany({
      where: { empresaId: scope.empresaId },
      include: { usuario: { select: { nome: true } } },
      orderBy: { usuario: { nome: "asc" } },
    }),
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, select: { id: true, nome: true, cor: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <ConteudosMobile
      nomeUsuario={nomeUsuario}
      isProfessor={!isAdmin}
      alunos={alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        professoraId: a.professoraId ?? null,
        serie: a.serie,
        escolaMetodo: a.unidade.escola.metodoEnsino,
        materias: Array.from(
          new Map(
            a.aulas
              .flatMap((aula) => [aula.materia, ...aula.materias.map((am) => am.materia)])
              .filter((m): m is NonNullable<typeof m> => !!m)
              .map((m) => [m.id, { materiaId: m.id, materia: m }])
          ).values()
        ),
      }))}
      professoras={professoras.map((p) => ({ id: p.id, nome: p.usuario.nome }))}
      materias={materias}
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

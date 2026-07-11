import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { GraduationCap } from "lucide-react";
import ConteudosClient from "@/components/ConteudosClient";

export const dynamic = "force-dynamic";

export default async function ConteudosPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  // Nesta página, "admin" inclui SUPERADMIN e AUXILIAR — só PROFESSORA é
  // restrita aos próprios alunos (comportamento pré-existente preservado).
  const isAdmin = scope.perfil !== "PROFESSORA";
  const filtroProf = (!isAdmin && scope.professoraId) ? { professoraId: scope.professoraId } : {};

  const [alunos, conteudos, professoras, materias] = await Promise.all([
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
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, select: { id: true, nome: true, cor: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <GraduationCap size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Conteúdos Didáticos</h1>
      </div>
      <Suspense>
      <ConteudosClient
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
        materias={materias}
        isProfessor={!isAdmin}
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
      </Suspense>
    </div>
  );
}

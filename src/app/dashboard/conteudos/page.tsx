import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GraduationCap } from "lucide-react";
import ConteudosClient from "@/components/ConteudosClient";

export const dynamic = "force-dynamic";

export default async function ConteudosPage() {
  const session     = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;
  const perfil       = (session?.user as any)?.perfil as string | null;
  const isAdmin      = perfil !== "PROFESSORA";
  const filtroProf  = (!isAdmin && professoraId) ? { professoraId } : {};

  const [alunos, conteudos, professoras, materias] = await Promise.all([
    prisma.aluno.findMany({
      where: { ...filtroProf },
      include: { materias: { include: { materia: true } }, professora: { select: { id: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.conteudo.findMany({
      where: { aluno: filtroProf },
      include: {
        aluno: {
          select: {
            nome: true,
            professora: { select: { usuario: { select: { nome: true } } } },
          },
        },
        materia: true,
      },
      orderBy: { data: "desc" },
      take: 50,
    }),
    prisma.professora.findMany({
      where: { usuario: { perfil: "PROFESSORA" } },
      include: { usuario: { select: { nome: true } } },
      orderBy: { usuario: { nome: "asc" } },
    }),
    prisma.materia.findMany({ select: { id: true, nome: true, cor: true }, orderBy: { nome: "asc" } }),
  ]);

  // Busca aulas agendadas vinculadas a cada conteúdo (por alunoId + data)
  const alunoIds = [...new Set(conteudos.map((c) => c.alunoId))];
  const datas = conteudos.map((c) => c.data);
  const dataMin = datas.length > 0 ? new Date(Math.min(...datas.map((d) => d.getTime()))) : new Date();
  const dataMax = datas.length > 0 ? new Date(Math.max(...datas.map((d) => d.getTime())) + 86400000) : new Date();

  const aulasAgendadas = alunoIds.length > 0
    ? await prisma.agendaAula.findMany({
        where: { alunoId: { in: alunoIds }, data: { gte: dataMin, lt: dataMax } },
        select: { id: true, alunoId: true, data: true, horaInicio: true, horaFim: true, status: true, materia: { select: { nome: true, cor: true } } },
      })
    : [];

  // Mapa: "alunoId|YYYY-MM-DD" → aula
  const aulaMap = new Map(
    aulasAgendadas.map((a) => [
      `${a.alunoId}|${a.data.toISOString().split("T")[0]}`,
      { id: a.id, horaInicio: a.horaInicio, horaFim: a.horaFim, status: a.status as string, materia: a.materia },
    ])
  );

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
          agenda: aulaMap.get(`${c.alunoId}|${c.data.toISOString().split("T")[0]}`) ?? null,
        }))}
      />
      </Suspense>
    </div>
  );
}

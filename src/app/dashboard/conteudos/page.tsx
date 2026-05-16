import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GraduationCap } from "lucide-react";
import ConteudosClient from "@/components/ConteudosClient";

export const dynamic = "force-dynamic";

export default async function ConteudosPage() {
  const session     = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;
  const filtroProf  = professoraId ? { professoraId } : {};

  const [alunos, conteudos] = await Promise.all([
    prisma.aluno.findMany({
      where: { ...filtroProf, status: "ATIVO" },
      include: { materias: { include: { materia: true } } },
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
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <GraduationCap size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Conteúdos Didáticos</h1>
      </div>
      <ConteudosClient
        alunos={alunos}
        isProfessor={!!professoraId}
        conteudosIniciais={conteudos.map((c) => ({
          ...c,
          data:      c.data.toISOString(),
          criadoEm:  c.criadoEm.toISOString(),
          aluno: {
            nome:      c.aluno.nome,
            professora: c.aluno.professora?.usuario?.nome ?? null,
          },
        }))}
      />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClipboardList } from "lucide-react";
import NotasClient from "@/components/NotasClient";

export default async function NotasPage() {
  const session = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;
  const filtroProf = professoraId ? { professoraId } : {};

  const [alunos, avaliacoes, notas] = await Promise.all([
    prisma.aluno.findMany({
      where: { ...filtroProf, status: "ATIVO" },
      include: {
        materias: { include: { materia: true } },
        unidade: { include: { escola: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.avaliacao.findMany({
      include: { unidade: { include: { escola: true } } },
      orderBy: { data: "asc" },
    }),
    prisma.nota.findMany({
      where: { aluno: filtroProf },
      include: { avaliacao: true, materia: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardList size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Notas</h1>
      </div>
      <NotasClient
        alunos={alunos as any}
        avaliacoes={avaliacoes.map((a) => ({ ...a, data: a.data.toISOString() })) as any}
        notasIniciais={notas as any}
      />
    </div>
  );
}

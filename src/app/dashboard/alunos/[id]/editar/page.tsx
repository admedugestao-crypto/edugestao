import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AlunoForm from "@/components/AlunoForm";

export const dynamic = "force-dynamic";

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;
  const { id } = await params;

  const [aluno, escolas, materias] = await Promise.all([
    prisma.aluno.findUnique({
      where: { id },
      include: {
        materias: true,
        unidade: { include: { escola: true } },
      },
    }),
    prisma.escola.findMany({
      include: { unidades: { orderBy: { nome: "asc" } } },
      orderBy: { nome: "asc" },
    }),
    prisma.materia.findMany({ orderBy: { nome: "asc" } }),
  ]);

  if (!aluno) notFound();

  const alunoInicial = {
    ...aluno,
    unidade: { ...aluno.unidade, escolaId: aluno.unidade.escolaId ?? aluno.unidadeId },
    materias: aluno.materias.map((m) => ({ materiaId: m.materiaId })),
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Editar Aluno</h1>
        <p className="text-slate-500 text-sm mt-1">{aluno.nome}</p>
      </div>
      <AlunoForm
        escolas={escolas}
        materias={materias}
        alunoInicial={alunoInicial}
      />
    </div>
  );
}

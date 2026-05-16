import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AlunoForm from "@/components/AlunoForm";

export default async function NovoAlunoPage() {
  const session = await auth();
  const professoraId = (session?.user as any)?.professoraId as string | null;

  const [escolas, materias] = await Promise.all([
    prisma.escola.findMany({
      include: { unidades: { orderBy: { nome: "asc" } } },
      orderBy: { nome: "asc" },
    }),
    prisma.materia.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Novo Aluno</h1>
        <p className="text-slate-500 text-sm mt-1">Preencha os dados do aluno</p>
      </div>
      <AlunoForm escolas={escolas} materias={materias} />
    </div>
  );
}

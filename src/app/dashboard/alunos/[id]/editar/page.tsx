import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { notFound, redirect } from "next/navigation";
import AlunoForm from "@/components/AlunoForm";

export const dynamic = "force-dynamic";

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const perfil = scope.perfil;
  const isAdmin = scope.isAdmin;
  const { id } = await params;

  const [aluno, escolas, materias, professoras, professoraSession] = await Promise.all([
    prisma.aluno.findUnique({
      where: { id },
      include: {
        materias: true,
        unidade: { include: { escola: true } },
      },
    }),
    prisma.escola.findMany({
      where: { empresaId: scope.empresaId },
      include: { unidades: { orderBy: { nome: "asc" } } },
      orderBy: { nome: "asc" },
    }),
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
    isAdmin
      ? (prisma.professora.findMany({
          where: { empresaId: scope.empresaId },
          select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
          orderBy: { usuario: { nome: "asc" } },
        }) as unknown as Promise<any[]>)
      : Promise.resolve([] as any[]),
    !isAdmin
      ? prisma.professora.findUnique({
          where: { usuarioId: scope.userId },
          select: { disponibilidade: true },
        })
      : Promise.resolve(null),
  ]);

  if (!aluno || aluno.empresaId !== scope.empresaId) notFound();

  const dispProfessora = isAdmin ? null : ((professoraSession?.disponibilidade as any) ?? []);

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
        professoras={professoras}
        perfil={perfil}
        dispProfessora={dispProfessora}
      />
    </div>
  );
}

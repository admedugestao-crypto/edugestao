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
  const perfil = (session?.user as any)?.perfil as string;
  const sessionUserId = (session?.user as any)?.id as string;
  const isAdmin = perfil === "SUPERADMIN";
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
      include: { unidades: { orderBy: { nome: "asc" } } },
      orderBy: { nome: "asc" },
    }),
    prisma.materia.findMany({ orderBy: { nome: "asc" } }),
    isAdmin
      ? prisma.professora.findMany({
          include: { usuario: { select: { nome: true } }, },
          orderBy: { usuario: { nome: "asc" } },
        })
      : Promise.resolve([]),
    !isAdmin
      ? prisma.professora.findUnique({
          where: { usuarioId: sessionUserId },
          select: { disponibilidade: true },
        })
      : Promise.resolve(null),
  ]);

  if (!aluno) notFound();

  // Para admin: inclui disponibilidade de cada professora
  const professorasComDisp = isAdmin
    ? await prisma.professora.findMany({
        select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
        orderBy: { usuario: { nome: "asc" } },
      })
    : [];

  // disponibilidade da professora logada (não-admin) ou null
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
        professoras={isAdmin ? professorasComDisp : professoras}
        perfil={perfil}
        dispProfessora={dispProfessora}
      />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AlunoForm from "@/components/AlunoForm";

export const dynamic = "force-dynamic";

export default async function NovoAlunoPage() {
  const session = await auth();
  const perfil = (session?.user as any)?.perfil as string;
  const sessionUserId = (session?.user as any)?.id as string;
  const isAdmin = perfil === "SUPERADMIN";

  const [escolas, materias, professorasComDisp, professoraSession] = await Promise.all([
    prisma.escola.findMany({
      include: { unidades: { orderBy: { nome: "asc" } } },
      orderBy: { nome: "asc" },
    }),
    prisma.materia.findMany({ orderBy: { nome: "asc" } }),
    isAdmin
      ? prisma.professora.findMany({
          select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
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

  const dispProfessora = isAdmin ? null : ((professoraSession?.disponibilidade as any) ?? []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Novo Aluno</h1>
        <p className="text-slate-500 text-sm mt-1">Preencha os dados do aluno</p>
      </div>
      <AlunoForm
        escolas={escolas}
        materias={materias}
        professoras={professorasComDisp}
        perfil={perfil}
        dispProfessora={dispProfessora}
      />
    </div>
  );
}

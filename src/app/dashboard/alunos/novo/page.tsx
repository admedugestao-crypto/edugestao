import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import AlunoForm from "@/components/AlunoForm";

export const dynamic = "force-dynamic";

export default async function NovoAlunoPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const perfil = scope.perfil;
  const isAdmin = scope.isAdmin;

  const [escolas, materias, professorasComDisp, professoraSession] = await Promise.all([
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

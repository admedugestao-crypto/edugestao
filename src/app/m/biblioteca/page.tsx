import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { redirect } from "next/navigation";
import BibliotecaMobile from "@/components/BibliotecaMobile";

export const dynamic = "force-dynamic";

export default async function BibliotecaMobilePage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const session     = await auth();
  const nomeUsuario = (session?.user as any)?.name as string ?? "";

  const [materiais, materias] = await Promise.all([
    prisma.materialBiblioteca.findMany({
      where: { empresaId: scope.empresaId },
      include: { materia: true },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <BibliotecaMobile
      nomeUsuario={nomeUsuario}
      materiaisIniciais={materiais}
      materias={materias}
    />
  );
}

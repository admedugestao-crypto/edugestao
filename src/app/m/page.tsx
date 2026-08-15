import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { redirect } from "next/navigation";
import DashboardMobile from "@/components/DashboardMobile";

export const dynamic = "force-dynamic";

export default async function MobileHomePage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const session     = await auth();
  const nomeUsuario = (session?.user as any)?.name as string ?? "";

  // Provas próximas: da própria professora, ou (para admin) da primeira
  // professora cadastrada — mesmo padrão default já usado na tela de Agenda.
  let professoraIdProvas = scope.professoraId ?? "";
  if (scope.isAdmin && !professoraIdProvas) {
    const primeira = await prisma.professora.findFirst({
      where: { empresaId: scope.empresaId },
      select: { id: true },
      orderBy: { usuario: { nome: "asc" } },
    });
    professoraIdProvas = primeira?.id ?? "";
  }

  return <DashboardMobile nomeUsuario={nomeUsuario} professoraIdProvas={professoraIdProvas}/>;
}

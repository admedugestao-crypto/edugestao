import { auth } from "@/lib/auth";
import { getSessionScope } from "@/lib/tenant";
import { redirect } from "next/navigation";
import DashboardMobile from "@/components/DashboardMobile";

export const dynamic = "force-dynamic";

export default async function MobileHomePage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const session     = await auth();
  const nomeUsuario = (session?.user as any)?.name as string ?? "";

  return (
    <DashboardMobile
      nomeUsuario={nomeUsuario}
      professoraIdProvas={scope.professoraId ?? ""}
    />
  );
}

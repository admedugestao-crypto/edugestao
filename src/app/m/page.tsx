import { auth } from "@/lib/auth";
import DashboardMobile from "@/components/DashboardMobile";

export const dynamic = "force-dynamic";

export default async function MobileHomePage() {
  const session     = await auth();
  const nomeUsuario = (session?.user as any)?.name as string ?? "";

  return <DashboardMobile nomeUsuario={nomeUsuario} />;
}

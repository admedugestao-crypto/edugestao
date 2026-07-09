import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sessionUser = session.user as { id?: string; empresaId?: string };
  const userId = sessionUser.id;
  const empresaId = sessionUser.empresaId;
  const [db, empresa] = await Promise.all([
    userId ? prisma.usuario.findUnique({ where: { id: userId }, select: { foto: true } }) : null,
    empresaId ? prisma.empresa.findUnique({ where: { id: empresaId }, select: { logoUrl: true } }) : null,
  ]);

  const usuario = { ...session.user, foto: db?.foto ?? null };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="print:hidden">
        <Sidebar usuario={usuario} empresaLogoUrl={empresa?.logoUrl ?? null} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="print:hidden">
          <TopBar usuario={usuario} />
        </div>
        <main className="flex-1 overflow-y-auto p-6 bg-slate-100 print:p-0 print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}

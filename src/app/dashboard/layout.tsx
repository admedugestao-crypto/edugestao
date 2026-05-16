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

  const userId = (session.user as any).id as string | undefined;
  const db = userId
    ? await prisma.usuario.findUnique({ where: { id: userId }, select: { foto: true } })
    : null;

  const usuario = { ...session.user, foto: db?.foto ?? null };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar usuario={usuario} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar usuario={usuario} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-100">{children}</main>
      </div>
    </div>
  );
}

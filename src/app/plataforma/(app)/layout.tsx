import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SairButton from "./SairButton";

export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any).perfil !== "PLATAFORMA") {
    redirect("/plataforma/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="w-56 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <p className="font-bold text-white">Plataforma</p>
          <p className="text-xs text-slate-400 mt-0.5">{session.user?.name}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <Link href="/plataforma/empresas" className="block px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            Empresas
          </Link>
          <Link href="/plataforma/usuarios" className="block px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            Usuários
          </Link>
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <SairButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

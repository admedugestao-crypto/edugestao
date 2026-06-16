"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import Image from "next/image";

export default function TopBar({ usuario }: { usuario: any }) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Image src="/icone Edugestão.jpg" alt="EduGestão" width={44} height={44} className="rounded-xl shrink-0 object-contain" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-indigo-700">Gestão Educacional</p>
          <p className="text-xs text-slate-400">EduGestão</p>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
      >
        <LogOut size={15} />
        Sair
      </button>
    </header>
  );
}

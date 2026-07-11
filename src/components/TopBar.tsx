"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import Image from "next/image";

export default function TopBar({
  usuario,
  empresaLogoUrl,
  empresaNome,
}: {
  usuario: any;
  empresaLogoUrl?: string | null;
  empresaNome?: string | null;
}) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        {empresaLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={empresaLogoUrl}
            alt="Logo da empresa"
            className="max-h-10 max-w-[160px] object-contain shrink-0"
          />
        )}
        {empresaNome && (
          <p className="text-sm font-bold text-indigo-700">{empresaNome}</p>
        )}
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

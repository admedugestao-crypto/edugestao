"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import Image from "next/image";

export default function TopBar({
  usuario,
  empresaLogoUrl,
}: {
  usuario: any;
  empresaLogoUrl?: string | null;
}) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={empresaLogoUrl || "/icone-edugestao.jpg"}
          alt={empresaLogoUrl ? "Logo da empresa" : "EduGestão"}
          style={{ width: 34, height: 34, objectFit: "contain" }}
          className="shrink-0"
        />
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

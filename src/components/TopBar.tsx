"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

function Piramide() {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      className="w-10 h-10 shrink-0"
      aria-hidden="true"
    >
      {/* Círculo preto de fundo */}
      <circle cx="22" cy="22" r="21" fill="#111827" />
      {/* Face lateral direita — profundidade */}
      <polygon points="22,6 38,38 22,38" fill="#9ca3af" />
      {/* Face principal branca */}
      <polygon points="22,6 38,38 6,38" fill="white" />
      {/* Divisória central */}
      <line x1="22" y1="6" x2="22" y2="38" stroke="#111827" strokeWidth="1" opacity="0.2" />
      {/* Base */}
      <line x1="6" y1="38" x2="38" y2="38" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function TopBar({ usuario }: { usuario: any }) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Piramide />
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

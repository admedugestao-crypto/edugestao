"use client";

import { useRouter } from "next/navigation";
import { Home, LogOut } from "lucide-react";
import BottomNavMobile from "@/components/BottomNavMobile";

export default function DashboardMobile({ nomeUsuario }: { nomeUsuario: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col h-dvh bg-slate-100 select-none overflow-hidden">
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="bg-indigo-600 text-white px-4 pt-safe pb-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs opacity-75">EduGestão</p>
          <p className="text-sm font-bold leading-tight truncate max-w-[200px]">{nomeUsuario}</p>
        </div>
        <button onClick={() => router.push("/api/auth/signout")} className="opacity-75 hover:opacity-100">
          <LogOut size={18}/>
        </button>
      </div>

      {/* ── Boas-vindas ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-4 overflow-y-auto">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
          <Home size={28} className="text-indigo-600"/>
        </div>
        <p className="text-lg font-bold text-slate-800 text-center">Olá, {nomeUsuario}</p>
        <p className="text-sm text-slate-500 text-center">Use o menu abaixo para navegar.</p>
      </div>

      <BottomNavMobile/>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, GraduationCap, LogOut } from "lucide-react";

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

      {/* ── Atalhos ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
        <button onClick={() => router.push("/m/agenda")}
          className="w-full max-w-xs flex flex-col items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 py-8 active:scale-[0.98] transition-transform">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
            <CalendarDays size={26} className="text-indigo-600"/>
          </div>
          <span className="text-base font-bold text-slate-800">Agenda</span>
        </button>

        <button onClick={() => router.push("/m/conteudos")}
          className="w-full max-w-xs flex flex-col items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 py-8 active:scale-[0.98] transition-transform">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <GraduationCap size={26} className="text-emerald-600"/>
          </div>
          <span className="text-base font-bold text-slate-800">Conteúdos</span>
        </button>
      </div>
    </div>
  );
}

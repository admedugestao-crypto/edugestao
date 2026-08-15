"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { Home, LogOut, Bell } from "lucide-react";
import BottomNavMobile from "@/components/BottomNavMobile";

type Prova = {
  id: string; nome: string; data: string; serie: string;
  materiaNome: string | null; materiaCor: string | null;
  unidadeNome: string; escolaNome: string;
};

function parseLocal(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function DashboardMobile({
  nomeUsuario, professoraIdProvas,
}: { nomeUsuario: string; professoraIdProvas: string }) {
  const router = useRouter();

  const [provasProximas, setProvasProximas] = useState<Prova[]>([]);

  useEffect(() => {
    // Só busca provas quando quem está logado é (ou também é) professora —
    // admin puro, sem cadastro de professora vinculado, não vê esse aviso.
    if (!professoraIdProvas) { setProvasProximas([]); return; }
    fetch(`/api/provas-proximas?professoraId=${professoraIdProvas}`)
      .then((r) => r.json())
      .then((data) => setProvasProximas(Array.isArray(data) ? data : []))
      .catch(() => setProvasProximas([]));
  }, [professoraIdProvas]);

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

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* ── Provas próximas ──────────────────────────────────────────────── */}
        {provasProximas.length > 0 && (
          <div className="px-4 pt-3 pb-1 shrink-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
              <Bell size={13}/>
              {provasProximas.length === 1 ? "1 prova próxima" : `${provasProximas.length} provas próximas`}
            </p>
            <div className="space-y-2">
              {provasProximas.map((p) => {
                const dataProva = parseLocal(p.data);
                const diasRestantes = differenceInCalendarDays(dataProva, new Date());
                const aviso = diasRestantes === 0 ? "Hoje" : diasRestantes === 1 ? "Amanhã" : `Em ${diasRestantes} dias`;
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-amber-100 px-3 py-2 flex items-start gap-2">
                    {p.materiaCor && <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: p.materiaCor }}/>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {p.nome}{p.materiaNome ? ` – ${p.materiaNome}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{p.escolaNome} · {p.unidadeNome} · {p.serie}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      {aviso} · {format(dataProva, "dd/MM")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Boas-vindas ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <Home size={28} className="text-indigo-600"/>
          </div>
          <p className="text-lg font-bold text-slate-800 text-center">Olá, {nomeUsuario}</p>
          <p className="text-sm text-slate-500 text-center">Use o menu abaixo para navegar.</p>
        </div>
      </div>

      <BottomNavMobile/>
    </div>
  );
}

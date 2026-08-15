"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, CalendarDays, GraduationCap, Library } from "lucide-react";

const ABAS = [
  { rota: "/m",            label: "Início",     Icon: Home },
  { rota: "/m/agenda",     label: "Agenda",     Icon: CalendarDays },
  { rota: "/m/conteudos",  label: "Conteúdo",   Icon: GraduationCap },
  { rota: "/m/biblioteca", label: "Biblioteca", Icon: Library },
] as const;

export default function BottomNavMobile() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="shrink-0 bg-white border-t border-slate-200 flex pb-safe">
      {ABAS.map(({ rota, label, Icon }) => {
        const ativo = rota === "/m" ? pathname === "/m" : pathname.startsWith(rota);
        return (
          <button
            key={rota}
            onClick={() => router.push(rota)}
            className="relative flex-1 flex flex-col items-center gap-0.5 py-2"
          >
            {ativo && <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-indigo-600" />}
            <Icon size={20} className={ativo ? "text-indigo-600" : "text-slate-400"} />
            <span className={`text-[10px] font-medium ${ativo ? "text-indigo-600" : "text-slate-400"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

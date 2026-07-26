"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

function Avatar({ foto, nome }: { foto?: string | null; nome?: string }) {
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={nome ?? ""}
        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
      />
    );
  }
  const iniciais = (nome ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-xs shrink-0">
      {iniciais}
    </div>
  );
}

export default function TopBar({
  usuario,
  empresaLogoUrl,
  empresaNome,
}: {
  usuario: any;
  empresaLogoUrl?: string | null;
  empresaNome?: string | null;
}) {
  const isAdmin = usuario?.perfil === "SUPERADMIN" || usuario?.perfil === "SUPERADMIN_PROFESSORA";
  const isHibrido = usuario?.perfil === "SUPERADMIN_PROFESSORA";

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

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <Avatar foto={usuario?.foto} nome={usuario?.name} />
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">
              {usuario?.name}
            </p>
            <p className="text-[11px] text-slate-500 truncate max-w-[160px]">{usuario?.email}</p>
          </div>
          <span
            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
              isAdmin ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isHibrido ? "Administrador/Professor" : isAdmin ? "Administrador" : "Professor"}
          </span>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </header>
  );
}

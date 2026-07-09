"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  ClipboardList,
  Calendar,
  CalendarDays,
  GraduationCap,
  UserCog,
  Bell,
  DollarSign,
} from "lucide-react";

const nav = [
  { href: "/dashboard",                  label: "Dashboard",      icon: LayoutDashboard, adminOnly: false },
  { href: "/dashboard/agenda",           label: "Agenda",         icon: CalendarDays,    adminOnly: false },
  { href: "/dashboard/alunos",           label: "Alunos",         icon: Users,           adminOnly: false },
  { href: "/dashboard/escolas",          label: "Escolas",        icon: School,          adminOnly: false },
  { href: "/dashboard/disciplinas",      label: "Disciplinas",    icon: BookOpen,        adminOnly: false },
  { href: "/dashboard/calendario",       label: "Calendário",     icon: Calendar,        adminOnly: false },
  { href: "/dashboard/notas",            label: "Notas",          icon: ClipboardList,   adminOnly: false },
  { href: "/dashboard/conteudos",        label: "Conteúdos",      icon: GraduationCap,   adminOnly: false },
  { href: "/dashboard/pagamentos",       label: "Pagamentos",     icon: DollarSign,      adminOnly: false },
  { href: "/dashboard/notificacoes",     label: "Notificações",   icon: Bell,            adminOnly: true  },
  { href: "/dashboard/usuarios",         label: "Usuários",       icon: UserCog,         adminOnly: true  },
];

function Avatar({ foto, nome }: { foto?: string | null; nome?: string }) {
  if (foto) {
    return (
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

export default function Sidebar({ usuario }: { usuario: any }) {
  const pathname = usePathname();
  const isAdmin = usuario?.perfil === "SUPERADMIN";

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-col items-center justify-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icone-edugestao.jpg"
            alt="EduGestão"
            className="max-h-10 max-w-full object-contain"
          />
          <span className="font-bold text-slate-800 text-sm tracking-wide">EduGestão</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav
          .filter((item) => !item.adminOnly || isAdmin)
          .map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
      </nav>

      {/* Perfil do usuário logado */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <Avatar foto={usuario?.foto} nome={usuario?.name} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {usuario?.name}
            </p>
            <p className="text-xs text-slate-500 truncate">{usuario?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

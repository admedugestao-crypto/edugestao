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
  Bell,
  DollarSign,
  Library,
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
  { href: "/dashboard/biblioteca",       label: "Biblioteca",     icon: Library,         adminOnly: false },
  { href: "/dashboard/pagamentos",       label: "Pagamentos",     icon: DollarSign,      adminOnly: false },
  { href: "/dashboard/notificacoes",     label: "Notificações",   icon: Bell,            adminOnly: true  },
];

export default function Sidebar({ usuario, ambiente }: { usuario: any; ambiente: "Produção" | "Desenvolvimento" }) {
  const pathname = usePathname();
  const isAdmin = usuario?.perfil === "SUPERADMIN" || usuario?.perfil === "SUPERADMIN_PROFESSORA";

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
          <div className="text-center leading-tight">
            <p className="font-bold text-slate-800 text-sm tracking-wide">Gestão Educacional</p>
            <p className="text-xs text-slate-400">EduGestão</p>
            <span
              className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${
                ambiente === "Produção" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {ambiente}
            </span>
          </div>
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
    </aside>
  );
}

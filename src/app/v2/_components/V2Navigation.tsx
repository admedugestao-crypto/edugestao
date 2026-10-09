"use client";

import {
  Bell,
  Table2,
  BookOpenText,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  School,
  Users,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "../v2.module.css";
import CompanyLogoEditor from "./CompanyLogoEditor";
import type { VersaoApp } from "@/lib/versaoApp";

type NavigationProps = {
  versao: VersaoApp;
  ambiente: "Produção" | "Desenvolvimento";
  empresaNome: string;
  empresaLogoUrl: string | null;
  usuario: { nome: string; email: string; foto: string | null; perfil: string };
};

const items = [
  { href: "/v2", label: "Visão geral", icon: LayoutDashboard, v2: true },
  { href: "/v2/agenda", label: "Agenda", icon: CalendarDays, v2: true },
  { href: "/v2/alunos", label: "Alunos", icon: Users, v2: true },
  { href: "/v2/escolas", label: "Escolas", icon: School, v2: true },
  { href: "/v2/disciplinas", label: "Disciplinas", icon: GraduationCap, v2: true },
  { href: "/v2/calendario", label: "Calendário", icon: CalendarDays, v2: true },
  { href: "/v2/avaliacoes", label: "Avaliações", icon: BookOpenText, v2: true },
  { href: "/v2/tabelas", label: "Tabelas", icon: Table2, v2: true },
  { href: "/v2/conteudos", label: "Conteúdos", icon: BookOpenText, v2: true },
  { href: "/v2/biblioteca", label: "Biblioteca", icon: Library, v2: true },
  { href: "/v2/pagamentos", label: "Financeiro", icon: CircleDollarSign, v2: true },
  { href: "/v2/notificacoes", label: "Notificações", icon: Bell, adminOnly: true, v2: true },
];

const mobileShortcutHrefs = [
  "/v2",
  "/v2/agenda",
  "/v2/conteudos",
  "/v2/biblioteca",
  "/v2/pagamentos",
] as const;

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
}

export function V2Navigation({ ambiente, empresaNome, empresaLogoUrl, usuario, versao }: NavigationProps) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [editingLogo, setEditingLogo] = useState(false);
  const [savedLogo, setSavedLogo] = useState<string | null>(null);
  const logoUrl = savedLogo ?? empresaLogoUrl;
  const isAdmin = usuario.perfil === "SUPERADMIN" || usuario.perfil === "SUPERADMIN_PROFESSORA";

  const links = items.filter((item) => !item.adminOnly || isAdmin);
  const mobileShortcuts = mobileShortcutHrefs
    .map((href) => links.find((item) => item.href === href))
    .filter((item): item is (typeof links)[number] => Boolean(item));

  return (
    <>
      {editingLogo && <CompanyLogoEditor url={logoUrl} nome={empresaNome} onClose={() => setEditingLogo(false)} onSaved={setSavedLogo} />}
      <header className={styles.mobileHeader}>
        <button className={styles.iconButton} onClick={() => setAberto(true)} aria-label="Abrir menu">
          <Menu aria-hidden="true" size={21} />
        </button>
        <Image src="/logo-edugestao-v2.png" alt="EduGestão V2" width={108} height={45} priority className={styles.mobileBrandLogo} />
        <span className={styles.avatarSmall}>{iniciais(usuario.nome)}</span>
      </header>

      {aberto ? <button className={styles.backdrop} onClick={() => setAberto(false)} aria-label="Fechar menu" /> : null}

      <aside className={`${styles.sidebar} ${aberto ? styles.sidebarOpen : ""}`}>
        <div className={styles.brandBlock}>
          <Image src="/logo-edugestao-v2.png" alt="EduGestão V2" width={108} height={45} priority className={styles.brandLogo} />
          <div>
            <p className={styles.brandName}>EduGestão</p>
            <p className={styles.versionLabel}>Nova experiência · V2</p>
          </div>
          <button className={styles.closeButton} onClick={() => setAberto(false)} aria-label="Fechar menu">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className={styles.companyBlock}>
          {isAdmin ? <button type="button" className={styles.companyLogoButton} aria-label="Ajustar ícone da empresa" title="Ajustar ícone da empresa" onClick={() => setEditingLogo(true)}>{logoUrl ? <Image src={logoUrl} alt="" width={30} height={30} unoptimized className={styles.companyLogo} /> : iniciais(empresaNome)}</button> : logoUrl ? <Image src={logoUrl} alt="" width={30} height={30} unoptimized className={styles.companyLogo} /> : null}
          <div className={styles.companyCopy}>
            <span>Espaço de trabalho</span>
            <strong>{empresaNome}</strong>
          </div>
          <ChevronRight aria-hidden="true" size={16} />
        </div>

        <nav className={styles.nav} aria-label="Navegação principal">
          <p className={styles.navEyebrow}>Organizar o dia</p>
          {links.map(({ href, label, icon: Icon, v2 }) => {
            const active = v2 && (pathname === href || (href !== "/v2" && pathname.startsWith(`${href}/`)));
            return (
              <Link key={href} href={href} onClick={() => setAberto(false)} className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}>
                <Icon aria-hidden="true" size={18} />
                <span>{label}</span>
                {!v2 ? <small>beta</small> : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.profileBlock}>
          {usuario.foto ? <Image src={usuario.foto} alt="" width={36} height={36} unoptimized className={styles.avatarImage} /> : <span className={styles.avatar}>{iniciais(usuario.nome)}</span>}
          <div className={styles.profileCopy}><strong>{usuario.nome}</strong><span>{usuario.email}</span></div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className={styles.logout} aria-label="Sair">
            <LogOut aria-hidden="true" size={18} />
          </button>
        </div>
        <span className={styles.environment}>{ambiente}</span>
        {versao.url ? (
          <a className={styles.appVersion} href={versao.url} target="_blank" rel="noopener noreferrer" title="Ver esta versão no GitHub">
            Versão {versao.numero} · {versao.commit?.slice(0, 7)}
          </a>
        ) : <span className={styles.appVersion}>Versão {versao.numero} · local</span>}
      </aside>

      <nav className={styles.mobileNav} aria-label="Atalhos principais">
        {mobileShortcuts.map(({ href, label, icon: Icon, v2 }) => (
          <Link key={href} href={href} className={v2 && (pathname === href || (href !== "/v2" && pathname.startsWith(`${href}/`))) ? styles.mobileNavActive : ""}>
            <Icon aria-hidden="true" size={20} /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

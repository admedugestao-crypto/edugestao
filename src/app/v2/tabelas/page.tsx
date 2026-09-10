import { redirect } from "next/navigation";
import Link from "next/link";
import { ListChecks, ClipboardList, Clock3, ChevronRight } from "lucide-react";
import { getSessionScope } from "@/lib/tenant";
import styles from "./tabelas.module.css";

export const dynamic = "force-dynamic";

const tabelas = [
  { slug: "metodos-ensino", titulo: "Métodos de Ensino", descricao: "Organize os métodos usados nos materiais da Biblioteca.", icon: ListChecks, admin: false },
  { slug: "tipos-avaliacao", titulo: "Tipos de Avaliação", descricao: "Defina os tipos disponíveis no cadastro de avaliações.", icon: ClipboardList, admin: false },
  { slug: "disponibilidade-professores", titulo: "Disponibilidade dos Professores", descricao: "Configure os dias e horários de cada professor para a agenda.", icon: Clock3, admin: true },
];

export default async function TabelasPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  return <div className={styles.page}>
    <header className={styles.header}><div><h1>Tabelas auxiliares</h1><p>Gerencie os cadastros que organizam as avaliações, os materiais e os horários.</p></div></header>
    <div className={styles.cards}>
      {tabelas.filter((item) => !item.admin || scope.isAdmin).map(({ slug, titulo, descricao, icon: Icon }) =>
        <Link key={slug} href={`/v2/tabelas/${slug}`} className={styles.card}>
          <span className={styles.icon}><Icon size={23} aria-hidden="true" /></span>
          <div><h2>{titulo}</h2><p>{descricao}</p></div><ChevronRight size={18} aria-hidden="true" />
        </Link>)}
    </div>
  </div>;
}

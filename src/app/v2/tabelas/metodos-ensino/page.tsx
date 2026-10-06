import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import Link from "next/link";
import styles from "../tabelas.module.css";
import MetodosEnsinoClient from "@/components/MetodosEnsinoClient";

export const dynamic = "force-dynamic";

export default async function MetodosEnsinoPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const metodos = await prisma.metodoEnsino.findMany({
    where: { empresaId: scope.empresaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}><div><h1>Métodos de Ensino</h1><p>Organize os métodos utilizados nos materiais da Biblioteca.</p></div><Link href="/v2/tabelas">Voltar às tabelas</Link></header>
      <section className={styles.content} aria-label="Métodos de Ensino">
      <MetodosEnsinoClient metodosIniciais={metodos} />
      </section>
    </div>
  );
}

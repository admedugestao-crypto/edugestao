import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import Link from "next/link";
import styles from "../tabelas.module.css";
import TiposAvaliacaoClient from "@/components/TiposAvaliacaoClient";

export const dynamic = "force-dynamic";

export default async function TiposAvaliacaoPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const tipos = await prisma.tipoAvaliacao.findMany({
    where: { empresaId: scope.empresaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}><div><h1>Tipos de Avaliação</h1><p>Defina os tipos disponíveis no cadastro de avaliações.</p></div><Link href="/v2/tabelas">Voltar às tabelas</Link></header>
      <section className={styles.content} aria-label="Tipos de Avaliação">
      <TiposAvaliacaoClient tiposIniciais={tipos} />
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "../tabelas.module.css";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import DisponibilidadeProfessoresClient from "@/components/DisponibilidadeProfessoresClient";

export const dynamic = "force-dynamic";

export default async function DisponibilidadeProfessoresPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  if (!scope.isAdmin) redirect("/v2/tabelas");

  const professoras = await prisma.professora.findMany({
    where: { empresaId: scope.empresaId, usuario: { ativo: true } },
    orderBy: { usuario: { nome: "asc" } },
    select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}><div><h1>Disponibilidade dos Professores</h1><p>Defina os dias e horários usados na geração e validação da agenda.</p></div><Link href="/v2/tabelas">Voltar às tabelas</Link></header>
      <section className={styles.content} aria-label="Disponibilidade dos Professores">
      <DisponibilidadeProfessoresClient professorasIniciais={professoras.map((p) => ({
        id: p.id,
        nome: p.usuario.nome,
        disponibilidade: Array.isArray(p.disponibilidade) ? p.disponibilidade as { dia: string; inicio: string; fim: string }[] : [],
      }))} />
      </section>
    </div>
  );
}

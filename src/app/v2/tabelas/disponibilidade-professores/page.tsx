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
    select: { id: true, materias: { select: { materiaId: true } }, disponibilidade: true, usuario: { select: { nome: true } } },
  });

  const materias = await prisma.materia.findMany({ where: { empresaId: scope.empresaId }, select: { id: true, nome: true }, orderBy: { nome: "asc" } });

  return (
    <div className={styles.page}>
      <header className={styles.header}><div><h1>Disciplinas e disponibilidade dos professores</h1><p>Defina as disciplinas lecionadas e os horários disponíveis de cada professor.</p></div><Link href="/v2/tabelas">Voltar às tabelas</Link></header>
      <section className={styles.content} aria-label="Disponibilidade dos Professores">
      <DisponibilidadeProfessoresClient materias={materias} professorasIniciais={professoras.map((p) => ({
        id: p.id,
        materiaIds: p.materias.map(m => m.materiaId),
        nome: p.usuario.nome,
        disponibilidade: Array.isArray(p.disponibilidade) ? p.disponibilidade as { dia: string; inicio: string; fim: string }[] : [],
      }))} />
      </section>
    </div>
  );
}

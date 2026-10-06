import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import DisciplinasProfessor from "@/components/DisciplinasProfessor";
import styles from "../tabelas.module.css";
export const dynamic = "force-dynamic";
export default async function MinhasDisciplinas() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  if (scope.isAdmin) redirect("/v2/tabelas/disponibilidade-professores");
  if (!scope.professoraId) redirect("/v2/tabelas");
  const [materias, professora] = await Promise.all([
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.professora.findFirst({ where: { id: scope.professoraId, empresaId: scope.empresaId }, select: { materias: { select: { materiaId: true } } } }),
  ]);
  if (!professora) redirect("/v2/tabelas");
  return <div className={styles.page}><header className={styles.header}><h1>Minhas disciplinas</h1><Link href="/v2/tabelas">Voltar às tabelas</Link></header><section className={styles.content}><DisciplinasProfessor professoraId={scope.professoraId} materias={materias} iniciais={professora.materias.map(m => m.materiaId)}/></section></div>;
}

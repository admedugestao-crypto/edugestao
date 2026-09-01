import DisciplinasClient from "@/components/DisciplinasClient";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { BookOpenCheck, GraduationCap, Palette } from "lucide-react";
import { redirect } from "next/navigation";
import styles from "../v2.module.css";

export const dynamic = "force-dynamic";

export default async function V2DisciplinasPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const [materias, vinculos] = await Promise.all([
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
    scope.professoraId
      ? prisma.professoraMateria.findMany({ where: { professoraId: scope.professoraId }, select: { materiaId: true } })
      : Promise.resolve([]),
  ]);
  const minhasIds = vinculos.map((vinculo) => vinculo.materiaId);

  return (
    <div className={styles.subjectsPage}>
      <header className={styles.subjectsHeader}>
        <div>
          <p><GraduationCap aria-hidden="true" size={15} /> Mapa curricular</p>
          <h1>Disciplinas com <em>identidade.</em></h1>
          <span>Escolha o que você leciona e reconheça cada matéria pela própria cor.</span>
        </div>
        <div className={styles.subjectsSummary} aria-label="Resumo das disciplinas">
          <span><Palette aria-hidden="true" size={16} /><b>{materias.length}</b> cadastradas</span>
          <span><BookOpenCheck aria-hidden="true" size={16} /><b>{minhasIds.length}</b> ativas</span>
        </div>
      </header>

      <section className={styles.subjectsSurface} aria-label="Disciplinas cadastradas">
        <DisciplinasClient
          todasMaterias={materias}
          minhasIdsIniciais={minhasIds}
          professoraId={scope.professoraId ?? ""}
          variant="v2"
        />
      </section>
    </div>
  );
}

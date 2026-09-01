import BibliotecaClient from "@/components/BibliotecaClient";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { BookMarked, Files, Library } from "lucide-react";
import { redirect } from "next/navigation";
import styles from "../v2.module.css";

export const dynamic = "force-dynamic";

export default async function V2BibliotecaPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const [materiais, materias, metodos] = await Promise.all([
    prisma.materialBiblioteca.findMany({
      where: { empresaId: scope.empresaId },
      include: { materia: true, metodoEnsino: true, materias: { select: { materia: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
    prisma.metodoEnsino.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className={styles.libraryPage}>
      <header className={styles.libraryHeader}>
        <div>
          <p><Library aria-hidden="true" size={15} /> Acervo pedagógico</p>
          <h1>Materiais ao <em>alcance.</em></h1>
          <span>Encontre apostilas e documentos pelo método, série ou disciplina.</span>
        </div>
        <div className={styles.librarySummary} aria-label="Resumo da biblioteca">
          <span><Files aria-hidden="true" size={16} /><b>{materiais.length}</b> materiais</span>
          <span><BookMarked aria-hidden="true" size={16} /><b>{materias.length}</b> disciplinas</span>
        </div>
      </header>

      <section className={styles.librarySurface} aria-label="Acervo da biblioteca">
        <BibliotecaClient materiaisIniciais={materiais} materias={materias} metodos={metodos} variant="v2" />
      </section>
    </div>
  );
}

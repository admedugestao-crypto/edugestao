import EscolasClient from "@/components/EscolasClient";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { Building2, MapPin, School } from "lucide-react";
import { redirect } from "next/navigation";
import styles from "../v2.module.css";

export const dynamic = "force-dynamic";

export default async function V2EscolasPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const [escolas, metodos] = await Promise.all([
    prisma.escola.findMany({
      where: { empresaId: scope.empresaId },
      include: { unidades: { orderBy: { nome: "asc" } }, metodoEnsino: true },
      orderBy: { nome: "asc" },
    }),
    prisma.metodoEnsino.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
  ]);

  const escolasSerial = escolas.map((escola) => ({
    ...escola,
    periodoLetivo1Inicio: escola.periodoLetivo1Inicio?.toISOString() ?? null,
    periodoLetivo1Fim: escola.periodoLetivo1Fim?.toISOString() ?? null,
    periodoLetivo2Inicio: escola.periodoLetivo2Inicio?.toISOString() ?? null,
    periodoLetivo2Fim: escola.periodoLetivo2Fim?.toISOString() ?? null,
  }));
  const totalUnidades = escolas.reduce((total, escola) => total + escola.unidades.length, 0);

  return (
    <div className={styles.schoolsPage}>
      <header className={styles.schoolsHeader}>
        <div>
          <p><School aria-hidden="true" size={15} /> Rede de aprendizagem</p>
          <h1>Escolas em <em>contexto.</em></h1>
          <span>Organize instituições, unidades e períodos letivos em um só lugar.</span>
        </div>
        <div className={styles.schoolsSummary} aria-label="Resumo da rede escolar">
          <span><Building2 aria-hidden="true" size={16} /><b>{escolas.length}</b> escolas</span>
          <span><MapPin aria-hidden="true" size={16} /><b>{totalUnidades}</b> unidades</span>
        </div>
      </header>

      <section className={styles.schoolsSurface} aria-label="Escolas cadastradas">
        <EscolasClient escolasIniciais={escolasSerial} metodos={metodos} variant="v2" />
      </section>
    </div>
  );
}

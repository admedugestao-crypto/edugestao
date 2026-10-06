import NotasClient from "@/components/NotasClient";
import type { NotaWhereInput } from "@/generated/prisma/models/Nota";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { redirect } from "next/navigation";
import styles from "../v2.module.css";

export const dynamic = "force-dynamic";

export default async function V2AvaliacoesPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const notaWhere: NotaWhereInput = { empresaId: scope.empresaId };
  if (!scope.isAdmin && scope.professoraId) notaWhere.aluno = { professoraId: scope.professoraId };

  const [alunos, avaliacoes, notas] = await Promise.all([
    prisma.aluno.findMany({
      where: { ...scopeWhere(scope), status: "ATIVO" },
      select: {
        id: true,
        nome: true,
        serie: true,
        unidadeId: true,
        unidade: { select: { nome: true, escola: { select: { nome: true, periodoAvaliacao: true } } } },
        materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.avaliacao.findMany({
      where: { empresaId: scope.empresaId },
      include: { unidade: { include: { escola: true } }, materia: true },
      orderBy: { data: "asc" },
    }),
    prisma.nota.findMany({
      where: notaWhere,
      select: { id: true, alunoId: true, avaliacaoId: true, materiaId: true, valor: true },
    }),
  ]);

  return (
    <div className={styles.gradesPage}>
      <header className={styles.gradesHeader}>
        <div>
          <p><ClipboardCheck aria-hidden="true" size={15} /> Acompanhamento de aprendizagem</p>
          <h1>Resultados em <em>perspectiva.</em></h1>
          <span>Registre notas e acompanhe o desempenho de cada aluno por avaliação.</span>
        </div>
        <div className={styles.gradesSummary} aria-label="Resumo das avaliações">
          <span><Users aria-hidden="true" size={16} /><b>{alunos.length}</b> alunos</span>
          <span><GraduationCap aria-hidden="true" size={16} /><b>{avaliacoes.length}</b> avaliações</span>
        </div>
      </header>

      <section className={styles.gradesSurface} aria-label="Notas dos alunos">
        <NotasClient
          alunos={alunos}
          avaliacoes={avaliacoes.map((avaliacao) => ({ ...avaliacao, data: avaliacao.data.toISOString() }))}
          notasIniciais={notas}
          variant="v2"
        />
      </section>
    </div>
  );
}

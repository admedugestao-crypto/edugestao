import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import styles from "../v2.module.css";
import type { NotaWhereInput } from "@/generated/prisma/models/Nota";
import NotasClient from "@/components/NotasClient";

export const dynamic = "force-dynamic";

export default async function NotasPage() {
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
        unidade: {
          select: {
            nome: true,
            escola: { select: { nome: true, periodoAvaliacao: true } },
          },
        },
        materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.avaliacao.findMany({
      where: { empresaId: scope.empresaId },
      include: { materia: true, unidade: { include: { escola: true } } },
      orderBy: { data: "asc" },
    }),
    prisma.nota.findMany({
      where: notaWhere,
      include: { avaliacao: true, materia: true },
    }),
  ]);

  return (
    <div className={styles.gradesPage}>
      <header className={styles.gradesHeader}><div><h1>Notas</h1><span>Selecione um aluno para consultar e lançar suas notas por avaliação e disciplina.</span></div></header>
      <section className={styles.gradesSurface} aria-label="Lançamento de notas">
      <NotasClient
        variant="v2"
        alunos={alunos}
        avaliacoes={avaliacoes.map((a) => ({ ...a, data: a.data.toISOString() }))}
        notasIniciais={notas}
      />
      </section>
    </div>
  );
}

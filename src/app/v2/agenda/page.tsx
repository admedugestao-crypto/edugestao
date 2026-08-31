import AgendaClient from "@/components/AgendaClient";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { CalendarDays, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import styles from "../v2.module.css";

export const dynamic = "force-dynamic";

export default async function V2AgendaPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const professoraId = scope.professoraId;
  const isProfessor = !scope.isAdmin && Boolean(professoraId);

  const [alunos, materias, professoras] = await Promise.all([
    prisma.aluno.findMany({
      where: { ...scopeWhere(scope), status: "ATIVO" },
      select: {
        id: true, nome: true, serie: true, turma: true, diaSemana: true, professoraId: true,
        materias: { select: { materia: { select: { id: true, nome: true, cor: true } } } },
      },
      orderBy: { nome: "asc" },
    }),
    isProfessor
      ? prisma.materia.findMany({
          where: { empresaId: scope.empresaId, professoras: { some: { professoraId: professoraId! } } },
          select: { id: true, nome: true, cor: true }, orderBy: { nome: "asc" },
        })
      : prisma.materia.findMany({
          where: { empresaId: scope.empresaId }, select: { id: true, nome: true, cor: true }, orderBy: { nome: "asc" },
        }),
    prisma.professora.findMany({
      where: { empresaId: scope.empresaId },
      select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } },
      orderBy: { usuario: { nome: "asc" } },
    }),
  ]);

  return (
    <div className={styles.agendaPage}>
      <header className={styles.agendaHeader}>
        <div>
          <p><Sparkles aria-hidden="true" size={15} /> Planejamento do tempo</p>
          <h1>Sua agenda, <em>sem ruído.</em></h1>
          <span>Visualize aulas, encontre horários e organize a rotina em um só lugar.</span>
        </div>
        <div className={styles.agendaDate}>
          <CalendarDays aria-hidden="true" size={20} />
          <span>Hoje</span>
          <strong>{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</strong>
        </div>
      </header>

      <section className={styles.agendaSurface} aria-label="Calendário de aulas">
        <AgendaClient
          alunos={alunos.map((aluno) => ({ ...aluno, materias: aluno.materias.map((item) => item.materia) }))}
          materias={materias}
          professoras={professoras.map((professora) => ({ id: professora.id, nome: professora.usuario.nome }))}
          isProfessor={isProfessor}
          disponibilidades={professoras.map((professora) => ({
            professoraId: professora.id,
            slots: (professora.disponibilidade as { dia: string; inicio: string; fim: string }[]) ?? [],
          }))}
          professoraIdSessao={professoraId ?? ""}
        />
      </section>
    </div>
  );
}

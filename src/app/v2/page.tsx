import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { ArrowUpRight, CalendarCheck2, CircleDollarSign, Clock3, Sparkles, UserRoundCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./v2.module.css";

export const dynamic = "force-dynamic";

const formatarMoeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatarHora = (hora: string | null) => hora?.slice(0, 5) ?? "Horário a definir";

export default async function V2Dashboard() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const session = await auth();
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  const [alunosAtivos, aulasHoje, pagamentos, proximasAulas] = await Promise.all([
    prisma.aluno.count({ where: { ...scopeWhere(scope), status: "ATIVO" } }),
    prisma.agendaAula.count({ where: { ...scopeWhere(scope), data: { gte: inicio, lt: fim } } }),
    prisma.pagamento.findMany({
      where: { empresaId: scope.empresaId, pago: false, ...(scope.professoraId ? { aluno: { professoraId: scope.professoraId } } : {}) },
      select: { valorCobrado: true },
    }),
    prisma.agendaAula.findMany({
      where: { ...scopeWhere(scope), data: { gte: inicio } },
      orderBy: [{ data: "asc" }, { horaInicio: "asc" }],
      take: 4,
      include: { aluno: { select: { nome: true } } },
    }),
  ]);

  const pendente = pagamentos.reduce((total, item) => total + Number(item.valorCobrado), 0);
  const primeiroNome = session?.user?.name?.split(" ")[0] ?? "professora";
  const dataLonga = hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.dateLabel}>{dataLonga}</p>
          <h1>Seu dia em <em>perspectiva.</em></h1>
          <p>Olá, {primeiroNome}. Aqui está o que merece sua atenção agora.</p>
        </div>
        <Link href="/v2/agenda" className={styles.primaryAction}>Organizar agenda <ArrowUpRight aria-hidden="true" size={18} /></Link>
      </header>

      <section className={styles.focusStrip} aria-label="Resumo do dia">
        <div className={styles.focusIntro}><Sparkles aria-hidden="true" size={18} /><span>Foco de hoje</span></div>
        <strong>{aulasHoje === 0 ? "Agenda livre para planejar a semana" : `${aulasHoje} ${aulasHoje === 1 ? "aula programada" : "aulas programadas"}`}</strong>
        <Link href="/v2/agenda">Ver agenda <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </section>

      <section className={styles.metrics} aria-label="Indicadores principais">
        <article><span className={styles.metricIcon}><Users aria-hidden="true" size={20} /></span><div><small>Alunos acompanhados</small><strong>{alunosAtivos}</strong><p>ativos neste período</p></div></article>
        <article><span className={styles.metricIcon}><CalendarCheck2 aria-hidden="true" size={20} /></span><div><small>Ritmo de hoje</small><strong>{aulasHoje}</strong><p>aulas na agenda</p></div></article>
        <article><span className={styles.metricIcon}><CircleDollarSign aria-hidden="true" size={20} /></span><div><small>Valores em aberto</small><strong>{formatarMoeda(pendente)}</strong><p>acompanhamento financeiro</p></div></article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.scheduleCard}>
          <div className={styles.sectionHeading}><div><span>Próximos encontros</span><h2>A agenda continua daqui</h2></div><Link href="/v2/agenda">Agenda completa</Link></div>
          {proximasAulas.length === 0 ? (
            <div className={styles.emptyState}><CalendarCheck2 aria-hidden="true" /><strong>Nenhuma aula próxima</strong><p>Use este tempo para preparar conteúdos ou organizar uma nova aula.</p></div>
          ) : (
            <ol className={styles.timeline}>
              {proximasAulas.map((aula, index) => (
                <li key={aula.id}>
                  <span className={styles.timelineMarker}>{index + 1}</span>
                  <div><strong>{aula.aluno.nome}</strong><p>{aula.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {formatarHora(aula.horaInicio)}</p></div>
                  <span className={styles.status}>Programada</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className={styles.quickCard}>
          <div className={styles.sectionHeading}><div><span>Acesso rápido</span><h2>Continue de onde parou</h2></div></div>
          <Link href="/dashboard/alunos"><UserRoundCheck aria-hidden="true" /><span><strong>Gerenciar alunos</strong><small>Cadastros e acompanhamento</small></span><ArrowUpRight aria-hidden="true" /></Link>
          <Link href="/dashboard/conteudos"><BookIcon /><span><strong>Registrar conteúdo</strong><small>Histórico do que foi ensinado</small></span><ArrowUpRight aria-hidden="true" /></Link>
          <Link href="/dashboard/pagamentos"><Clock3 aria-hidden="true" /><span><strong>Revisar pendências</strong><small>Pagamentos que precisam de atenção</small></span><ArrowUpRight aria-hidden="true" /></Link>
        </aside>
      </div>
    </div>
  );
}

function BookIcon() {
  return <span className={styles.bookIcon} aria-hidden="true">Aa</span>;
}

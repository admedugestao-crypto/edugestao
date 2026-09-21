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

  const [alunosAtivos, aulasHoje, pagamentos, proximasAulas, totalEscolas, notas, provas] = await Promise.all([
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
    prisma.escola.count({ where: { empresaId: scope.empresaId } }),
    prisma.nota.findMany({
      where: { empresaId: scope.empresaId, ...(!scope.isAdmin ? { aluno: { professoraId: scope.professoraId } } : {}) },
      include: { aluno: { select: { nome: true } }, materia: true, avaliacao: { select: { nome: true, notaMax: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    scope.isAdmin ? Promise.resolve([]) : prisma.avaliacao.findMany({
      where: { empresaId: scope.empresaId, data: { gte: hoje }, ...(scope.professoraId ? { unidade: { alunos: { some: { professoraId: scope.professoraId, status: "ATIVO" } } } } : {}) },
      include: { unidade: { include: { escola: true } }, materia: true }, orderBy: { data: "asc" }, take: 6,
    }),
  ]);

  const notasBaixas = notas.filter(n => n.valor < n.avaliacao.notaMax / 2);
  const alunosComNotaBaixa = new Set(notasBaixas.map(n => n.alunoId)).size;
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
          <Link href="/v2/alunos"><UserRoundCheck aria-hidden="true" /><span><strong>Gerenciar alunos</strong><small>Cadastros e acompanhamento</small></span><ArrowUpRight aria-hidden="true" /></Link>
          <Link href="/v2/conteudos"><BookIcon /><span><strong>Registrar conteúdo</strong><small>Histórico do que foi ensinado</small></span><ArrowUpRight aria-hidden="true" /></Link>
          <Link href="/v2/pagamentos"><Clock3 aria-hidden="true" /><span><strong>Revisar pendências</strong><small>Pagamentos que precisam de atenção</small></span><ArrowUpRight aria-hidden="true" /></Link>
        </aside>
      </div>
      <section className={styles.pedagogicalGrid} aria-label="Acompanhamento pedagógico">
        <article className={styles.scheduleCard}>
          <div className={styles.sectionHeading}><div><span>{alunosComNotaBaixa} aluno(s) com notas baixas</span><h2>Atenção necessária</h2></div><Link href="/v2/notas">Ver notas</Link></div>
          <p className="text-xs text-slate-500 mb-3">Notas abaixo de 50% da nota máxima.</p>
          {!notasBaixas.length ? <p>Nenhum aluno abaixo da média.</p> : <ul className="max-h-52 overflow-y-auto space-y-3">{notasBaixas.map(n => <li key={n.id} className="flex justify-between gap-3 text-sm"><div><strong>{n.aluno.nome}</strong><p>{n.materia.nome} · {n.avaliacao.nome}</p></div><span>{n.valor.toFixed(1)} / {n.avaliacao.notaMax.toFixed(1)}</span></li>)}</ul>}
        </article>
        <article className={styles.scheduleCard}>
          <div className={styles.sectionHeading}><div><span>Rede de ensino</span><h2>{totalEscolas} escola(s) cadastrada(s)</h2></div><Link href="/v2/escolas">Ver escolas</Link></div>
          {!scope.isAdmin && <><h3 className="font-semibold mb-3">Próximas provas</h3>{!provas.length ? <p>Nenhuma prova agendada.</p> : <ul className="max-h-52 overflow-y-auto space-y-3">{provas.map(p => <li key={p.id} className="text-sm"><strong>{p.nome}</strong><p>{p.unidade.escola.nome} · {p.serie} · {p.materia?.nome} · {p.periodo}</p><time>{p.data.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</time></li>)}</ul>}<Link href="/v2/calendario" className="mt-3 inline-block">Ver calendário →</Link></>}
        </article>
      </section>
    </div>
  );
}

function BookIcon() {
  return <span className={styles.bookIcon} aria-hidden="true">Aa</span>;
}

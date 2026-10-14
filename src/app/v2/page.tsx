import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { ArrowUpRight, CalendarCheck2, CircleDollarSign, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./v2.module.css";
import { anoLetivoEncerrado, calcularMediaDasNotas, MEDIA_MINIMA_APROVACAO, obterUltimaNotaDisponivel } from "@/lib/alertasNotas";
import { PERIODOS_ESCOLARES } from "@/lib/periodosAvaliacao";
import FinanceiroDetalhesLink from "@/components/FinanceiroDetalhesLink";
import { dataHojeAgenda } from "@/lib/pendenciasAgenda";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const formatarMoeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatarHora = (hora: string | null) => hora?.slice(0, 5) ?? "Horário a definir";

type ResumoPainel = {
  alunosAtivos: bigint;
  aulasHoje: bigint;
  valorAberto: unknown;
  aulasPendentes: bigint;
  primeiraPendente: Date | null;
};

export default async function V2Dashboard() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const session = await auth();
  const hoje = new Date();
  const inicio = new Date(`${dataHojeAgenda(hoje)}T00:00:00.000Z`);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  const anoLetivo = hoje.getFullYear();

  const filtroProfessoraAgenda = !scope.isAdmin && scope.professoraId
    ? Prisma.sql` AND aa."professoraId" = ${scope.professoraId}`
    : Prisma.empty;
  const filtroProfessoraAluno = !scope.isAdmin && scope.professoraId
    ? Prisma.sql` AND al."professoraId" = ${scope.professoraId}`
    : Prisma.empty;

  const [resumoResultado, proximasAulas, notasPeriodo] = await Promise.all([
    prisma.$queryRaw<ResumoPainel[]>(Prisma.sql`
      SELECT
        (SELECT count(*) FROM "alunos" al
          WHERE al."empresaId" = ${scope.empresaId}
            AND al."status" = 'ATIVO'::"StatusAluno"${filtroProfessoraAluno}
        ) AS "alunosAtivos",
        (SELECT count(*) FROM "agenda_aulas" aa
          WHERE aa."empresaId" = ${scope.empresaId}
            AND aa."data" >= ${inicio}
            AND aa."data" < ${fim}${filtroProfessoraAgenda}
        ) AS "aulasHoje",
        (SELECT coalesce(sum(p."valorCobrado"), 0) FROM "pagamentos" p
          INNER JOIN "alunos" al ON al."id" = p."alunoId"
          WHERE p."empresaId" = ${scope.empresaId}
            AND p."pago" = false${filtroProfessoraAluno}
        ) AS "valorAberto",
        (SELECT count(*) FROM "agenda_aulas" aa
          WHERE aa."empresaId" = ${scope.empresaId}
            AND aa."status" = 'AGENDADA'::"StatusAula"
            AND aa."data" < ${inicio}${filtroProfessoraAgenda}
        ) AS "aulasPendentes",
        (SELECT min(aa."data") FROM "agenda_aulas" aa
          WHERE aa."empresaId" = ${scope.empresaId}
            AND aa."status" = 'AGENDADA'::"StatusAula"
            AND aa."data" < ${inicio}${filtroProfessoraAgenda}
        ) AS "primeiraPendente"
    `),
    prisma.agendaAula.findMany({
      where: { ...scopeWhere(scope), data: { gte: inicio } },
      orderBy: [{ data: "asc" }, { horaInicio: "asc" }],
      take: 4,
      include: { aluno: { select: { nome: true } } },
    }),
    prisma.notaPeriodo.findMany({
      where: { empresaId: scope.empresaId, ano: anoLetivo, aluno: { status: "ATIVO", ...(!scope.isAdmin ? { professoraId: scope.professoraId } : {}) } },
      include: {
        aluno: {
          select: {
            id: true,
            nome: true,
            unidade: { select: { escola: { select: { periodoAvaliacao: true, periodoLetivo1Inicio: true, periodoLetivo1Fim: true, periodoLetivo2Inicio: true, periodoLetivo2Fim: true } } } },
          },
        },
        materia: { select: { id: true, nome: true } },
      },
    }),
  ]);

  const resumo = resumoResultado[0];
  const alunosAtivos = Number(resumo?.alunosAtivos ?? 0);
  const aulasHoje = Number(resumo?.aulasHoje ?? 0);
  const aulasPendentes = Number(resumo?.aulasPendentes ?? 0);
  const pendente = Number(resumo?.valorAberto ?? 0);
  const dataPendencias = (resumo?.primeiraPendente ?? inicio).toISOString().slice(0, 10);
  const linkPendencias = `/v2/agenda?pendentes=1&data=${dataPendencias}`;

  const notasPorAlunoEMateria = new Map<string, typeof notasPeriodo>();
  for (const nota of notasPeriodo) {
    if (nota.tipoPeriodo !== nota.aluno.unidade.escola.periodoAvaliacao) continue;
    const chave = `${nota.alunoId}:${nota.materiaId}`;
    notasPorAlunoEMateria.set(chave, [...(notasPorAlunoEMateria.get(chave) ?? []), nota]);
  }
  const alertasNotasBaixas = [...notasPorAlunoEMateria.values()].flatMap((notasDaMateria) => {
    const [referencia] = notasDaMateria;
    const escola = referencia.aluno.unidade.escola;
    const periodos = escola.periodoAvaliacao ? PERIODOS_ESCOLARES[escola.periodoAvaliacao] : undefined;
    if (!periodos) return [];
    const alertas: { chave: string; aluno: string; materia: string; motivo: string; valor: number }[] = [];
    const ultimaNota = obterUltimaNotaDisponivel(escola, hoje, notasDaMateria);
    if (ultimaNota && ultimaNota.nota.valor < MEDIA_MINIMA_APROVACAO) {
      alertas.push({ chave: `${referencia.id}:periodo`, aluno: referencia.aluno.nome, materia: referencia.materia.nome, motivo: `${ultimaNota.rotulo}: ${ultimaNota.nota.valor.toFixed(1)}`, valor: ultimaNota.nota.valor });
    }
    const notasRegulares = periodos.map((_, indice) => notasDaMateria.find((nota) => nota.periodo === indice + 1)?.valor);
    const mediaAnual = calcularMediaDasNotas(notasRegulares.filter((nota): nota is number => nota !== undefined));
    if (anoLetivoEncerrado(escola, hoje) && notasRegulares.every((nota) => nota !== undefined) && mediaAnual !== null && mediaAnual < MEDIA_MINIMA_APROVACAO) {
      alertas.push({ chave: `${referencia.id}:anual`, aluno: referencia.aluno.nome, materia: referencia.materia.nome, motivo: `Média anual: ${mediaAnual.toFixed(1)}`, valor: mediaAnual });
    }
    return alertas;
  });
  const alunosComNotaBaixa = new Set(alertasNotasBaixas.map((alerta) => alerta.aluno)).size;
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
      </header>

      <section className={styles.focusStrip} aria-label="Resumo do dia">
        <div className={styles.focusIntro}><Sparkles aria-hidden="true" size={18} /><span>Foco de hoje</span></div>
        <strong>{aulasHoje === 0 ? "Agenda livre para planejar a semana" : `${aulasHoje} ${aulasHoje === 1 ? "aula programada" : "aulas programadas"}`}</strong>
      </section>

      <section className={styles.metrics} aria-label="Indicadores principais">
        <article><span className={styles.metricIcon}><Users aria-hidden="true" size={20} /></span><div><small>Alunos acompanhados</small><strong>{alunosAtivos}</strong><p>ativos neste período</p></div><Link href="/v2/alunos" className={styles.metricDetail}>Detalhes <ArrowUpRight aria-hidden="true" size={14} /></Link></article>
        <article><span className={styles.metricIcon}><CalendarCheck2 aria-hidden="true" size={20} /></span><div><small>Aulas pendentes</small><strong>{aulasPendentes}</strong><p>anteriores a hoje, ainda agendadas</p></div><Link href={linkPendencias} className={styles.metricDetail}>Detalhes <ArrowUpRight aria-hidden="true" size={14} /></Link></article>
        <article><span className={styles.metricIcon}><CircleDollarSign aria-hidden="true" size={20} /></span><div><small>Valores em aberto</small><strong>{formatarMoeda(pendente)}</strong><p>acompanhamento financeiro</p></div><FinanceiroDetalhesLink className={styles.metricDetail} escolherVisao={scope.isAdmin && Boolean(scope.professoraId)} /></article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.scheduleCard}>
          <div className={styles.sectionHeading}><div><span>Próximos encontros</span><h2>A agenda continua daqui</h2></div></div>
          {proximasAulas.length === 0 ? (
            <div className={styles.emptyState}><CalendarCheck2 aria-hidden="true" /><strong>Nenhuma aula próxima</strong><p>Use este tempo para preparar conteúdos ou organizar uma nova aula.</p></div>
          ) : (
            <ol className={styles.timeline}>
              {proximasAulas.map((aula, index) => (
                <li key={aula.id}>
                  <Link href={`/v2/agenda?aulaId=${aula.id}`} className={styles.timelineLink} aria-label={`Ver detalhes da aula de ${aula.aluno.nome}`}>
                  <span className={styles.timelineMarker}>{index + 1}</span>
                  <div><strong>{aula.aluno.nome}</strong><p>{aula.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {formatarHora(aula.horaInicio)}</p></div>
                  <span className={styles.status}>Programada</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className={styles.scheduleCard}>
          <div className={styles.sectionHeading}><div><span>{alunosComNotaBaixa} aluno(s) com notas baixas</span><h2>Atenção necessária</h2></div><Link href="/v2/avaliacoes">Ver planilha</Link></div>
          <p className="text-xs text-slate-500 mb-3">Considera a última nota lançada por matéria até o período atual e, após o fim do ano letivo, a média anual abaixo de {MEDIA_MINIMA_APROVACAO.toFixed(1)}.</p>
          {!alertasNotasBaixas.length ? <p>Nenhum aluno abaixo da média.</p> : <ul className="max-h-52 overflow-y-auto space-y-3">{alertasNotasBaixas.map((alerta) => <li key={alerta.chave} className="flex justify-between gap-3 text-sm"><div><strong>{alerta.aluno}</strong><p>{alerta.materia} · {alerta.motivo}</p></div><span>{alerta.valor.toFixed(1)} / {MEDIA_MINIMA_APROVACAO.toFixed(1)}</span></li>)}</ul>}
        </aside>
      </div>
    </div>
  );
}

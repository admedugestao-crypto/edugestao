import { ArrowUpRight, CalendarCheck2, CircleDollarSign, Clock3, Sparkles, UserRoundCheck, Users } from "lucide-react";
import Link from "next/link";
import { V2Navigation } from "../v2/_components/V2Navigation";
import styles from "../v2/v2.module.css";

const aulas = [
  { nome: "Aluna 01", data: "Hoje · 14:00" },
  { nome: "Aluno 02", data: "Hoje · 16:30" },
  { nome: "Aluna 03", data: "Amanhã · 09:00" },
  { nome: "Aluno 04", data: "Amanhã · 11:00" },
];

export default function V2PreviewPage() {
  return (
    <div className={styles.appShell}>
      <V2Navigation
        ambiente="Desenvolvimento"
        empresaNome="KCF · Aulas Particulares"
        empresaLogoUrl={null}
        usuario={{ nome: "Professora Demo", email: "ambiente de demonstração", foto: null, perfil: "SUPERADMIN_PROFESSORA" }}
      />
      <main className={styles.main}>
        <div className={styles.dashboard}>
          <header className={styles.pageHeader}>
            <div>
              <p className={styles.dateLabel}>segunda-feira, 31 de agosto</p>
              <h1>Seu dia em <em>perspectiva.</em></h1>
              <p>Olá, professora. Aqui está o que merece sua atenção agora.</p>
            </div>
            <Link href="#agenda" className={styles.primaryAction}>Organizar agenda <ArrowUpRight aria-hidden="true" size={18} /></Link>
          </header>

          <section className={styles.focusStrip} aria-label="Resumo do dia">
            <div className={styles.focusIntro}><Sparkles aria-hidden="true" size={18} /><span>Foco de hoje</span></div>
            <strong>2 aulas programadas e 1 pagamento para revisar</strong>
            <Link href="#agenda">Ver agenda <ArrowUpRight aria-hidden="true" size={16} /></Link>
          </section>

          <section className={styles.metrics} aria-label="Indicadores principais">
            <article><span className={styles.metricIcon}><Users aria-hidden="true" size={20} /></span><div><small>Alunos acompanhados</small><strong>38</strong><p>ativos neste período</p></div></article>
            <article><span className={styles.metricIcon}><CalendarCheck2 aria-hidden="true" size={20} /></span><div><small>Ritmo de hoje</small><strong>2</strong><p>aulas na agenda</p></div></article>
            <article><span className={styles.metricIcon}><CircleDollarSign aria-hidden="true" size={20} /></span><div><small>Valores em aberto</small><strong>R$ 1.480</strong><p>acompanhamento financeiro</p></div></article>
          </section>

          <div className={styles.contentGrid} id="agenda">
            <section className={styles.scheduleCard}>
              <div className={styles.sectionHeading}><div><span>Próximos encontros</span><h2>A agenda continua daqui</h2></div><Link href="#agenda">Agenda completa</Link></div>
              <ol className={styles.timeline}>
                {aulas.map((aula, index) => (
                  <li key={aula.nome}>
                    <span className={styles.timelineMarker}>{index + 1}</span>
                    <div><strong>{aula.nome}</strong><p>{aula.data}</p></div>
                    <span className={styles.status}>Programada</span>
                  </li>
                ))}
              </ol>
            </section>

            <aside className={styles.quickCard}>
              <div className={styles.sectionHeading}><div><span>Acesso rápido</span><h2>Continue de onde parou</h2></div></div>
              <Link href="#"><UserRoundCheck aria-hidden="true" /><span><strong>Gerenciar alunos</strong><small>Cadastros e acompanhamento</small></span><ArrowUpRight aria-hidden="true" /></Link>
              <Link href="#"><span className={styles.bookIcon} aria-hidden="true">Aa</span><span><strong>Registrar conteúdo</strong><small>Histórico do que foi ensinado</small></span><ArrowUpRight aria-hidden="true" /></Link>
              <Link href="#"><Clock3 aria-hidden="true" /><span><strong>Revisar pendências</strong><small>Pagamentos que precisam de atenção</small></span><ArrowUpRight aria-hidden="true" /></Link>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

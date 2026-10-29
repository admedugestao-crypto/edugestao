import type { Metadata, Viewport } from "next";
import Image from "next/image";
import FormularioInscricao from "./FormularioInscricao";
import styles from "./inscricao.module.css";

export const metadata: Metadata = {
  title: "Inscrição para o teste do EG V2",
  description: "Seleção de 5 professores para testar o EG V2 gratuitamente por 60 dias, com mais 12 meses gratuitos a partir do lançamento oficial, reportar problemas ao suporte do app e sugerir melhorias. Contato com todos os inscritos pelo WhatsApp.",
  openGraph: { title: "Sua experiência pode ajudar a construir o EG V2", description: "5 professores selecionados. 60 dias de teste e mais 12 meses gratuitos a partir do lançamento oficial para os 5 selecionados.", type: "website" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true, themeColor: "#102345" };

export default function InscricaoTestePage() {
  return (
    <main className={styles.pagina}>
      <div className={styles.apresentacao}>
        <header className={styles.marca}>
          <Image src="/eg-v2-campanha.png" alt="EG V2" width={172} height={143} priority />
          <a href="#inscricao">Quero me inscrever</a>
        </header>
        <div className={styles.convite}>
          <p className={styles.chamada}>Um convite para quem ensina</p>
          <h1>Sua experiência pode ajudar a construir o EG V2.</h1>
          <p className={styles.resumo}>Vamos selecionar <strong>5 professores</strong> para testar o EG V2 <strong>gratuitamente por 60 dias</strong>. Os selecionados terão também <strong>12 meses gratuitos a partir do lançamento oficial</strong>.</p>
          <p className={styles.descricao}>Durante o teste, use o EG V2 na sua rotina, reporte problemas ao suporte do app e compartilhe sugestões de melhoria.</p>
        </div>
        <section className={styles.etapas} aria-label="Como funciona a seleção">
          <div><span>1</span><p>Você preenche a inscrição.</p></div>
          <div><span>2</span><p>Entraremos em contato pelo WhatsApp.</p></div>
          <div><span>3</span><p>Confirmaremos os 5 selecionados e orientaremos os usuários para início do processo.</p></div>
        </section>
        <p className={styles.observacao}>A inscrição não garante a participação. A equipe comunicará aos selecionados o aceite e enviará pelo WhatsApp as instruções para começar.</p>
      </div>
      <section className={styles.formulario} id="inscricao" aria-labelledby="titulo-inscricao">
        <p className={styles.indicacao}>Seleção de professores</p>
        <h2 id="titulo-inscricao">Vamos conhecer sua rotina?</h2>
        <p className={styles.introducao}>Preencha seus dados. Entraremos em contato com <strong>todos os inscritos</strong> pelo WhatsApp informado.</p>
        <FormularioInscricao />
        <footer className={styles.rodape}>EG V2 · Gestão para quem ensina</footer>
      </section>
    </main>
  );
}

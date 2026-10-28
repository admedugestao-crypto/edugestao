import type { Metadata, Viewport } from "next";
import Image from "next/image";
import FormularioInscricao from "./FormularioInscricao";
import styles from "./inscricao.module.css";

export const metadata: Metadata = {
  title: "Inscrição para o teste do EG V2",
  description: "Candidate-se para participar do teste do EG V2. Vamos selecionar 5 professores e entrar em contato com todos os inscritos pelo WhatsApp.",
  openGraph: { title: "Seu jeito de ensinar pode ajudar a construir o EG V2", description: "Seleção de 5 professores para testar a plataforma. Inscreva-se para conversar com nossa equipe.", type: "website" },
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
          <p className={styles.resumo}>Vamos selecionar <strong>5 professores</strong> para testar a plataforma e compartilhar o que faz diferença na rotina de quem dá aula.</p>
          <p className={styles.descricao}>Agenda, conteúdos, materiais e financeiro: queremos ouvir você e entender como o EG V2 pode apoiar o seu dia a dia.</p>
        </div>
        <section className={styles.etapas} aria-label="Como funciona a seleção">
          <div><span>1</span><p>Você preenche a inscrição.</p></div>
          <div><span>2</span><p>Conversamos com todos pelo WhatsApp.</p></div>
          <div><span>3</span><p>Selecionamos 5 professores para o teste.</p></div>
        </section>
        <p className={styles.observacao}>A inscrição registra seu interesse e não garante a participação. A equipe explicará as condições do teste durante o contato.</p>
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

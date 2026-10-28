"use client";

import { useRef, useState } from "react";
import { CONFIRMACAO_INSCRICAO } from "@/lib/inscricaoTeste";
import styles from "./inscricao.module.css";

export default function FormularioInscricao() {
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState("");
  const trava = useRef(false);
  const confirmacao = useRef<HTMLDivElement>(null);

  async function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current) return;
    trava.current = true;
    setEnviando(true);
    setErro("");
    const campos = new FormData(event.currentTarget);
    try {
      const resposta = await fetch("/api/inscricao-teste", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: campos.get("nome"), email: campos.get("email"), whatsapp: campos.get("whatsapp"),
          materias: campos.get("materias"), quantidadeAlunos: Number(campos.get("quantidadeAlunos")),
          organizacao: campos.get("organizacao"), dificuldade: campos.get("dificuldade"),
          disponibilidade: campos.get("disponibilidade") === "sim", consentimento: campos.get("consentimento") === "on", site: campos.get("site"),
        }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro ?? "Não foi possível concluir a inscrição.");
      setConcluido(true);
      requestAnimationFrame(() => confirmacao.current?.focus());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha de conexão. Tente novamente.");
    } finally {
      trava.current = false;
      setEnviando(false);
    }
  }

  if (concluido) return (
    <div className={styles.confirmacao} tabIndex={-1} ref={confirmacao} role="status">
      <span aria-hidden="true">✓</span>
      <h3>Inscrição recebida!</h3>
      <p>{CONFIRMACAO_INSCRICAO}</p>
      <p>Você não precisa se inscrever novamente. Fique de olho nas mensagens do seu WhatsApp.</p>
    </div>
  );

  return (
    <form onSubmit={enviar} className={styles.campos} aria-busy={enviando}>
      <p className={styles.obrigatorios}>Todos os campos abaixo são obrigatórios.</p>
      <label>Nome completo<input name="nome" autoComplete="name" required minLength={3} maxLength={120} placeholder="Como podemos chamar você?" /></label>
      <div className={styles.dupla}>
        <label>WhatsApp com DDD<input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" required minLength={10} maxLength={30} placeholder="(31) 99999-9999" /></label>
        <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={180} placeholder="voce@exemplo.com" /></label>
      </div>
      <div className={styles.dupla}>
        <label>Matérias ou áreas de atuação<input name="materias" required minLength={2} maxLength={200} placeholder="Ex.: matemática, alfabetização" /></label>
        <label>Quantos alunos atende hoje?<input name="quantidadeAlunos" type="number" inputMode="numeric" min={0} max={10000} step={1} required placeholder="Ex.: 12" /></label>
      </div>
      <label>Como organiza suas aulas e pagamentos hoje?<textarea name="organizacao" required minLength={3} maxLength={600} rows={2} placeholder="Caderno, planilha, WhatsApp, outro sistema..." /></label>
      <label>Qual é sua maior dificuldade na gestão das aulas?<textarea name="dificuldade" required minLength={5} maxLength={1000} rows={2} placeholder="Conte o que mais ocupa seu tempo." /></label>
      <label>Tem disponibilidade para testar e compartilhar sugestões?
        <select name="disponibilidade" required defaultValue=""><option value="" disabled>Selecione uma opção</option><option value="sim">Sim, tenho interesse e disponibilidade</option><option value="nao">Preciso entender as condições primeiro</option></select>
      </label>
      <div className={styles.isca} aria-hidden="true"><label>Seu site<input name="site" tabIndex={-1} autoComplete="off" /></label></div>
      <label className={styles.consentimento}><input name="consentimento" type="checkbox" required /><span>Autorizo o contato pelo WhatsApp sobre minha inscrição e a seleção para o teste do EG V2.</span></label>
      <details className={styles.privacidade}><summary>Como usaremos seus dados</summary><p>A equipe do EG V2 usará as informações para analisar sua candidatura e entrar em contato sobre esta seleção. Somente a equipe responsável terá acesso às inscrições. Você pode solicitar a correção ou exclusão dos dados, ou desistir da seleção, durante o atendimento pelo WhatsApp. Não usaremos esta autorização para campanhas de outros produtos.</p></details>
      {erro && <p className={styles.erro} role="alert">{erro}</p>}
      <button type="submit" disabled={enviando}>{enviando ? "Enviando inscrição..." : "Quero participar da seleção"}<span aria-hidden="true">↗</span></button>
      <p className={styles.aviso}>O envio não cria uma conta nem garante uma das 5 vagas.</p>
    </form>
  );
}

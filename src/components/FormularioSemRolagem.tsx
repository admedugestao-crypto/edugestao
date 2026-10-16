"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./FormularioSemRolagem.module.css";

/** Mantém os campos montados e distribui o conteúdo em páginas pela altura real. */
export default function FormularioSemRolagem({ children, ativo = true, className = "", chave = "", modal = false, colunas = 1, permitirRolagem = false }: {
  children: ReactNode;
  ativo?: boolean;
  className?: string;
  chave?: string | number;
  modal?: boolean;
  colunas?: 1 | 2;
  /** Fluxos com campos repetíveis permanecem em uma tela e passam a rolar o conteúdo. */
  permitirRolagem?: boolean;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const paginas = useRef<HTMLElement[][]>([]);
  const paginaAtual = useRef(0);
  const chaveAnterior = useRef(chave);
  const [estado, setEstado] = useState({ pagina: 0, total: 1 });

  useLayoutEffect(() => {
    const conteudo = raiz.current;
    if (!ativo || permitirRolagem || !conteudo) return;
    if (chaveAnterior.current !== chave) {
      paginaAtual.current = 0;
      chaveAnterior.current = chave;
    }
    let quadro = 0;
    const limpar = () => conteudo.querySelectorAll("[data-entrada-oculta]").forEach(el => el.removeAttribute("data-entrada-oculta"));
    const blocos = () => Array.from(conteudo.querySelectorAll<HTMLElement>("[data-etapa], [data-entrada-grupos]")).filter(el => !el.hidden && !el.classList.contains("hidden"));
    function exibir(itens: HTMLElement[]) {
      const visiveis = new Set(itens);
      for (const item of paginas.current.flat()) item.toggleAttribute("data-entrada-oculta", !visiveis.has(item));
      for (const bloco of blocos()) {
        bloco.toggleAttribute("data-entrada-oculta", !itens.some(item => bloco.contains(item)));
      }
    }
    function medir() {
      if (!conteudo) return;
      const foco = document.activeElement instanceof HTMLElement && conteudo.contains(document.activeElement) ? document.activeElement : null;
      if (modal) {
        const viewport = conteudo.parentElement;
        const dialogo = viewport?.closest<HTMLElement>("[data-entrada-dialogo]") ?? viewport?.parentElement;
        if (viewport && dialogo) {
          const reserva = dialogo.scrollHeight - viewport.getBoundingClientRect().height + 32;
          viewport.style.setProperty("--entrada-altura", `${Math.max(120, window.innerHeight - reserva)}px`);
        }
      }
      limpar();
      const itens: HTMLElement[] = [];
      function percorrer(el: HTMLElement) {
        if (el.hidden || el.classList.contains("hidden") || el.hasAttribute("data-entrada-cabecalho")) return;
        const filhos = Array.from(el.children).filter((filho): filho is HTMLElement => filho instanceof HTMLElement);
        if (el.hasAttribute("data-etapa")) {
          for (const filho of filhos) {
            if (filho.querySelector("h2")) continue;
            percorrer(filho);
          }
        } else if (!el.matches("[data-availability-row], [data-entrada-linha]") && (el.matches("[data-entrada-grupos], .grid, .space-y-2, .space-y-3, .space-y-4") ||
          (el.classList.contains("flex-wrap") && filhos.every(filho => filho.tagName === "BUTTON" || filho.tagName === "LABEL")))) {
          filhos.forEach(percorrer);
        } else {
          itens.push(el);
        }
      }
      Array.from(conteudo.children).forEach(el => { if (el instanceof HTMLElement) percorrer(el); });
      paginas.current = [itens];
      const limite = conteudo.clientHeight;
      if (!limite) return;
      const resultado: HTMLElement[][] = [];
      let atual: HTMLElement[] = [];
      for (const item of itens) {
        const tentativa = [...atual, item];
        exibir(tentativa);
        if (atual.length && conteudo.scrollHeight > limite + 1) {
          resultado.push(atual);
          atual = [item];
        } else atual = tentativa;
      }
      if (atual.length) resultado.push(atual);
      paginas.current = resultado.length ? resultado : [[]];
      paginaAtual.current = Math.min(paginaAtual.current, paginas.current.length - 1);
      const paginaFoco = foco ? paginas.current.findIndex(itens => itens.some(item => item.contains(foco))) : -1;
      if (paginaFoco >= 0) paginaAtual.current = paginaFoco;
      exibir(paginas.current[paginaAtual.current]);
      foco?.focus({ preventScroll: true });
      setEstado({ pagina: paginaAtual.current, total: paginas.current.length });
    }
    const agendar = () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(medir); };
    const revelar = (evento: Event) => {
      const alvo = evento.target;
      if (!(alvo instanceof HTMLElement)) return;
      const indice = paginas.current.findIndex(itens => itens.some(item => item === alvo || item.contains(alvo)));
      if (indice >= 0) {
        paginaAtual.current = indice;
        exibir(paginas.current[indice]);
        setEstado({ pagina: indice, total: paginas.current.length });
      }
    };
    const tamanho = new ResizeObserver(agendar);
    tamanho.observe(conteudo);
    if (modal && conteudo.parentElement?.parentElement) tamanho.observe(conteudo.parentElement.parentElement);
    const alteracoes = new MutationObserver(agendar);
    alteracoes.observe(conteudo, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
    conteudo.addEventListener("entrada:revelar", revelar);
    conteudo.addEventListener("invalid", revelar, true);
    medir();
    return () => {
      cancelAnimationFrame(quadro);
      tamanho.disconnect();
      alteracoes.disconnect();
      conteudo.removeEventListener("entrada:revelar", revelar);
      conteudo.removeEventListener("invalid", revelar, true);
      limpar();
    };
  }, [ativo, chave, modal, colunas, permitirRolagem]);

  if (!ativo) return <div className={className}>{children}</div>;
  const mudar = (pagina: number) => {
    paginaAtual.current = pagina;
    // A paginação não desmonta os inputs: valores digitados e arquivos são preservados.
    const itens = new Set(paginas.current[pagina]);
    for (const item of paginas.current.flat()) item.toggleAttribute("data-entrada-oculta", !itens.has(item));
    raiz.current?.querySelectorAll<HTMLElement>("[data-etapa], [data-entrada-grupos]").forEach(bloco => {
      if (!bloco.hidden && !bloco.classList.contains("hidden")) bloco.toggleAttribute("data-entrada-oculta", ![...itens].some(item => bloco.contains(item)));
    });
    setEstado({ pagina, total: paginas.current.length });
  };
  return <div className={`${styles.viewport} ${modal ? styles.modal : ""} ${permitirRolagem ? styles.rolagem : ""}`}>
    <div ref={raiz} className={`${styles.conteudo} ${colunas === 2 ? styles.grade : ""} ${className}`}>{children}</div>
    {!permitirRolagem && <nav className={styles.navegacao} aria-label="Páginas dos campos" style={{ visibility: estado.total > 1 ? "visible" : "hidden" }}>
      <button type="button" disabled={estado.pagina === 0} onClick={() => mudar(estado.pagina - 1)}>Campos anteriores</button>
      <span aria-live="polite">{estado.pagina + 1} / {estado.total}</span>
      <button type="button" disabled={estado.pagina === estado.total - 1} onClick={() => mudar(estado.pagina + 1)}>Próximos campos</button>
    </nav>}
  </div>;
}

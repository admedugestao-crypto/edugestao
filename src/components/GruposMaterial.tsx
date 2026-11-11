"use client";

import { Children, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const grupos = ["Identificação", "Classificação", "Arquivo"];

export default function GruposMaterial({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  const [grupoAtual, setGrupoAtual] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const campos = raiz.current;
    const modal = campos?.closest<HTMLElement>('[data-v2-library-modal="true"]');
    const viewport = window.visualViewport;
    if (!ativo || !campos || !modal || !viewport) return;

    let quadro = 0;
    const ajustar = () => {
      modal.style.setProperty("--biblioteca-altura-visivel", `${viewport.height}px`);
      modal.style.setProperty("--biblioteca-topo-visivel", `${viewport.offsetTop}px`);
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const foco = document.activeElement;
        if ((foco instanceof HTMLInputElement || foco instanceof HTMLTextAreaElement) && campos.contains(foco)) {
          foco.scrollIntoView({ block: "nearest" });
        }
      });
    };

    ajustar();
    viewport.addEventListener("resize", ajustar);
    viewport.addEventListener("scroll", ajustar);
    return () => {
      viewport.removeEventListener("resize", ajustar);
      viewport.removeEventListener("scroll", ajustar);
      cancelAnimationFrame(quadro);
      modal.style.removeProperty("--biblioteca-altura-visivel");
      modal.style.removeProperty("--biblioteca-topo-visivel");
    };
  }, [ativo]);

  if (!ativo) return <div className="space-y-3">{children}</div>;

  return (
    <div ref={raiz}>
      <nav aria-label="Grupos do material" className="mb-4 flex flex-wrap gap-2 min-[721px]:hidden">
        {grupos.map((grupo, indice) => (
          <button
            key={grupo}
            type="button"
            aria-pressed={grupoAtual === indice}
            onClick={() => setGrupoAtual(indice)}
            className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700 aria-pressed:border-indigo-600 aria-pressed:bg-indigo-50 aria-pressed:text-indigo-700"
          >
            {grupo}
          </button>
        ))}
      </nav>
      <div className="min-[721px]:grid min-[721px]:grid-cols-2 min-[721px]:gap-3">
        {Children.map(children, (grupo, indice) => (
          <div className={`${grupoAtual === indice ? "block" : "hidden"} min-[721px]:contents`}>
            {grupo}
          </div>
        ))}
      </div>
    </div>
  );
}

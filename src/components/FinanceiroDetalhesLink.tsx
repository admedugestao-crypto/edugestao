"use client";

import { ArrowUpRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function FinanceiroDetalhesLink({ escolherVisao, className }: { escolherVisao: boolean; className: string }) {
  const [aberto, setAberto] = useState(false);

  if (!escolherVisao) {
    return <Link href="/v2/pagamentos?abertos=1" className={className}>Detalhes <ArrowUpRight aria-hidden="true" size={14} /></Link>;
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={className} style={{ border: 0, background: "transparent", padding: 0, font: "inherit", cursor: "pointer" }}>
        Detalhes <ArrowUpRight aria-hidden="true" size={14} />
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={() => setAberto(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="visao-financeira-titulo" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Valores em aberto</p>
                <h2 id="visao-financeira-titulo" className="mt-1 text-xl font-bold text-slate-900">Qual visão deseja consultar?</h2>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setAberto(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X size={20} /></button>
            </div>
            <p className="mb-5 text-sm leading-6 text-slate-600">Escolha o conjunto de cobranças pendentes que será exibido.</p>
            <div className="grid gap-3">
              <Link href="/v2/pagamentos?abertos=1&visao=administrador" onClick={() => setAberto(false)} className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-500 hover:bg-indigo-50">
                <strong className="block text-slate-900">Visão de Administrador</strong>
                <span className="mt-1 block text-sm text-slate-600">Todas as cobranças pendentes da empresa.</span>
              </Link>
              <Link href="/v2/pagamentos?abertos=1&visao=professor" onClick={() => setAberto(false)} className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-500 hover:bg-indigo-50">
                <strong className="block text-slate-900">Visão de Professor</strong>
                <span className="mt-1 block text-sm text-slate-600">Cobranças pendentes somente dos seus alunos.</span>
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

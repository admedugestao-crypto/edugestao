"use client";

import { useState } from "react";
import Link from "next/link";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [linkDev, setLinkDev] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const res = await fetch("/api/esqueci-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao enviar. Tente novamente.");
        return;
      }
      setLinkDev(data.linkDev ?? null);
      setEnviado(true);
    } catch {
      setErro("Erro ao enviar. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white text-2xl font-bold mb-3">
            E
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Esqueci minha senha</h1>
          <p className="text-slate-500 text-sm mt-1">
            Informe seu e-mail para receber um link de redefinição.
          </p>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Se este e-mail estiver cadastrado, você vai receber um link de redefinição em instantes.
            </p>
            {linkDev && (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
                <p className="text-amber-700 font-medium">
                  E-mail não configurado neste ambiente — link só pra teste:
                </p>
                <a href={linkDev} className="text-indigo-600 hover:underline break-all">
                  {linkDev}
                </a>
              </div>
            )}
            <Link
              href="/login"
              className="block text-center w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} method="post" action="#" className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="off"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="seu@email.com"
              />
            </div>

            {erro && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {carregando ? "Enviando..." : "Enviar link de redefinição"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

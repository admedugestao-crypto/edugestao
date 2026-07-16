"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch("/api/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErro(data.erro ?? "Erro ao redefinir a senha. Tente novamente.");
        return;
      }

      setSucesso(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setErro("Erro ao redefinir a senha. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          Link inválido. Solicite um novo link de redefinição.
        </p>
        <Link
          href="/esqueci-senha"
          className="block text-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} method="post" action="#" className="space-y-4" autoComplete="off">
      <div className="hidden" aria-hidden="true">
        <input type="text" name="username" tabIndex={-1} />
        <input type="password" name="password" tabIndex={-1} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nova senha</label>
        <input
          type="password"
          name="nova_senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={6}
          autoFocus
          autoComplete="new-password"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar nova senha</label>
        <input
          type="password"
          name="confirmar_senha"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          autoComplete="new-password"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="••••••••"
        />
      </div>

      {erro && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Senha redefinida! Redirecionando para o login...
        </p>
      )}

      <button
        type="submit"
        disabled={carregando || sucesso}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
      >
        {sucesso ? "Redirecionando..." : carregando ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white text-2xl font-bold mb-3">
            E
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Redefinir senha</h1>
          <p className="text-slate-500 text-sm mt-1">Escolha sua nova senha de acesso.</p>
        </div>
        <Suspense>
          <RedefinirSenhaForm />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { isMobileUserAgent } from "@/lib/device";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cadastroOk = searchParams.get("cadastro") === "ok";

  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [empresaSlug, setEmpresaSlug] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleValidarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const res = await fetch(`/api/empresas/validar-slug?slug=${encodeURIComponent(empresaSlug.trim())}`);
    const data = await res.json();
    setCarregando(false);

    if (!res.ok) {
      setErro(data.erro ?? "Empresa não encontrada.");
      return;
    }

    setEmpresaNome(data.nome);
    setEtapa(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const res = await signIn("credentials", {
      empresaSlug: empresaSlug.trim(),
      email,
      password: senha,
      redirect: false,
    });

    setCarregando(false);

    if (res?.error) {
      setErro("E-mail ou senha incorretos.");
    } else {
      router.push(isMobileUserAgent(navigator.userAgent) ? "/m" : "/dashboard");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white text-2xl font-bold mb-3">
          E
        </div>
        <h1 className="text-2xl font-bold text-slate-800">EduGestão</h1>
        <p className="text-slate-500 text-sm mt-1">
          {etapa === 1 ? "Gestão de alunos" : empresaNome}
        </p>
      </div>

      {etapa === 1 ? (
        <form onSubmit={handleValidarEmpresa} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código da empresa</label>
            <input
              type="text"
              value={empresaSlug}
              onChange={(e) => setEmpresaSlug(e.target.value)}
              required
              autoFocus
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: minha-escola"
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
            {carregando ? "Verificando..." : "Continuar"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {cadastroOk && (
            <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Conta criada com sucesso! Faça login para continuar.
            </p>
          )}

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
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={() => { setEtapa(1); setErro(""); }}
            className="w-full text-slate-500 hover:text-slate-700 text-xs transition-colors"
          >
            ← Trocar empresa
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-500 mt-6">
        Não tem uma conta?{" "}
        <Link href="/cadastro" className="text-indigo-600 hover:underline font-medium">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

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

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const res = await signIn("credentials", {
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
        <p className="text-slate-500 text-sm mt-1">Gestão de alunos</p>
      </div>

      <form onSubmit={handleSubmit} method="post" action="#" className="space-y-4" autoComplete="off">
        {/* Campos-isca: absorvem o autofill do navegador antes dos campos reais
            (Chrome/Edge ignoram autoComplete="off" em formulários de login). */}
        <div className="hidden" aria-hidden="true">
          <input type="text" name="username" tabIndex={-1} />
          <input type="password" name="password" tabIndex={-1} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input
            type="email"
            name="user_email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="off"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Senha</label>
            <Link href="/esqueci-senha" className="text-xs text-indigo-600 hover:underline font-medium">
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <input
              type={mostrarSenha ? "text" : "password"}
              name="user_senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="off"
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
      </form>
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

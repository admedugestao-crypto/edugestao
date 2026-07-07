"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ empresaNome: "", nome: "", email: "", senha: "", confirmar: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (form.senha !== form.confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    const res = await fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaNome: form.empresaNome,
        nome: form.nome,
        email: form.email,
        senha: form.senha,
      }),
    });

    const data = await res.json();
    setCarregando(false);

    if (!res.ok) {
      setErro(data.erro ?? "Erro ao criar conta.");
      return;
    }

    router.push("/login?cadastro=ok");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white text-2xl font-bold mb-3">
            E
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Criar conta</h1>
          <p className="text-slate-500 text-sm mt-1">Cadastre sua empresa no EduGestão</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa</label>
            <input
              type="text"
              value={form.empresaNome}
              onChange={(e) => setForm({ ...form, empresaNome: e.target.value })}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Escola da Karin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Seu nome</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              required
              minLength={6}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label>
            <input
              type="password"
              value={form.confirmar}
              onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
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
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

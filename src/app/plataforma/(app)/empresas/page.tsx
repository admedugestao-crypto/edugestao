"use client";

import { useEffect, useState } from "react";

type Empresa = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  criadoEm: string;
  _count: { usuarios: number };
};

const formVazio = { empresaNome: "", nome: "", email: "", senha: "" };
const formEdicaoVazio = { nome: "", slug: "" };

export default function PlataformaEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [formEdicao, setFormEdicao] = useState(formEdicaoVazio);
  const [erroEdicao, setErroEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  async function carregar() {
    setCarregandoLista(true);
    const res = await fetch("/api/plataforma/empresas");
    const data = await res.json();
    setEmpresas(data);
    setCarregandoLista(false);
  }

  useEffect(() => { carregar(); }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    const res = await fetch("/api/plataforma/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSalvando(false);
    if (!res.ok) {
      setErro(data.erro ?? "Erro ao criar empresa.");
      return;
    }
    setModal(false);
    setForm(formVazio);
    carregar();
  }

  async function alternarAtivo(id: string, ativo: boolean) {
    await fetch(`/api/plataforma/empresas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !ativo }),
    });
    carregar();
  }

  function abrirEdicao(empresa: Empresa) {
    setEmpresaEditando(empresa);
    setFormEdicao({ nome: empresa.nome, slug: empresa.slug });
    setErroEdicao("");
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaEditando) return;
    setErroEdicao("");
    setSalvandoEdicao(true);
    const res = await fetch(`/api/plataforma/empresas/${empresaEditando.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formEdicao),
    });
    const data = await res.json();
    setSalvandoEdicao(false);
    if (!res.ok) {
      setErroEdicao(data.erro ?? "Erro ao salvar alterações.");
      return;
    }
    setEmpresaEditando(null);
    carregar();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Empresas</h1>
        <button
          onClick={() => setModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nova empresa
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {carregandoLista ? (
          <p className="p-6 text-sm text-slate-500">Carregando...</p>
        ) : empresas.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nenhuma empresa cadastrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">Código</th>
                <th className="text-left px-4 py-2.5">Usuários</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {empresas.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{e.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{e.slug}</td>
                  <td className="px-4 py-3 text-slate-500">{e._count.usuarios}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${e.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {e.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => abrirEdicao(e)}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarAtivo(e.id, e.ativo)}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      {e.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Nova empresa</h2>
            <form onSubmit={criar} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa</label>
                <input
                  type="text"
                  value={form.empresaNome}
                  onChange={(e) => setForm({ ...form, empresaNome: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do administrador</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha inicial</label>
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  required
                  minLength={6}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {erro && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModal(false); setErro(""); }}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
                >
                  {salvando ? "Criando..." : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {empresaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar empresa</h2>
            <form onSubmit={salvarEdicao} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa</label>
                <input
                  type="text"
                  value={formEdicao.nome}
                  onChange={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código (usado no login)</label>
                <input
                  type="text"
                  value={formEdicao.slug}
                  onChange={(e) => setFormEdicao({ ...formEdicao, slug: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Alterar o código muda o link de login usado pela empresa.
                </p>
              </div>

              {erroEdicao && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroEdicao}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEmpresaEditando(null); setErroEdicao(""); }}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
                >
                  {salvandoEdicao ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

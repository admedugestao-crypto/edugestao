"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criadoEm: string;
  perfil: "PLATAFORMA" | "SUPERADMIN";
  empresa: { nome: string; slug: string } | null;
};

const formVazio = { nome: "", email: "", senha: "" };
const formEdicaoVazio = { nome: "", senha: "" };

export default function PlataformaUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [formEdicao, setFormEdicao] = useState(formEdicaoVazio);
  const [erroEdicao, setErroEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [mostrarSenhaEdicao, setMostrarSenhaEdicao] = useState(false);

  async function carregar() {
    setCarregandoLista(true);
    const res = await fetch("/api/plataforma/usuarios");
    const data = await res.json();
    setUsuarios(data);
    setCarregandoLista(false);
  }

  useEffect(() => { carregar(); }, []);

  async function criar() {
    setErro("");
    setSalvando(true);
    try {
      const res = await fetch("/api/plataforma/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao criar usuário.");
        return;
      }
      setModal(false);
      setForm(formVazio);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(id: string, ativo: boolean) {
    await fetch(`/api/plataforma/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !ativo }),
    });
    carregar();
  }

  function abrirEdicao(usuario: Usuario) {
    setUsuarioEditando(usuario);
    setFormEdicao({ nome: usuario.nome, senha: "" });
    setErroEdicao("");
    setMostrarSenhaEdicao(false);
  }

  async function salvarEdicao() {
    if (!usuarioEditando) return;
    setErroEdicao("");
    setSalvandoEdicao(true);
    try {
      const body: { nome: string; senha?: string } = { nome: formEdicao.nome };
      if (formEdicao.senha) body.senha = formEdicao.senha;
      const res = await fetch(`/api/plataforma/usuarios/${usuarioEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroEdicao(data.erro ?? "Erro ao salvar alterações.");
        return;
      }
      setUsuarioEditando(null);
      carregar();
    } finally {
      setSalvandoEdicao(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Usuários</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Usuários internos da plataforma e administradores de cada empresa.
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Novo usuário interno
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {carregandoLista ? (
          <p className="p-6 text-sm text-slate-500">Carregando...</p>
        ) : usuarios.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nenhum usuário cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">E-mail</th>
                <th className="text-left px-4 py-2.5">Empresa</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.nome}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.empresa ? (
                      <span className="text-slate-700">{u.empresa.nome}</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        Plataforma
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => abrirEdicao(u)}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarAtivo(u.id, u.ativo)}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      {u.ativo ? "Desativar" : "Ativar"}
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
            <h2 className="text-lg font-bold text-slate-800 mb-4">Novo usuário</h2>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    required
                    minLength={6}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  type="button"
                  onClick={criar}
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

      {usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Editar usuário</h2>
            <p className="text-xs text-slate-500 mb-4">
              {usuarioEditando.empresa
                ? <>Administrador da empresa <strong>{usuarioEditando.empresa.nome}</strong> ({usuarioEditando.empresa.slug}).</>
                : "Usuário interno da plataforma (sem empresa vinculada)."}
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formEdicao.nome}
                  onChange={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={usuarioEditando.email}
                  disabled
                  className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nova senha (opcional)</label>
                <div className="relative">
                  <input
                    type={mostrarSenhaEdicao ? "text" : "password"}
                    value={formEdicao.senha}
                    onChange={(e) => setFormEdicao({ ...formEdicao, senha: e.target.value })}
                    minLength={6}
                    placeholder="Deixe em branco para não alterar"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaEdicao((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {mostrarSenhaEdicao ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {erroEdicao && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroEdicao}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setUsuarioEditando(null); setErroEdicao(""); }}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarEdicao}
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

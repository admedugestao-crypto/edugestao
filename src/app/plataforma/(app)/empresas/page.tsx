"use client";

import { useEffect, useState } from "react";

type Empresa = {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  ativo: boolean;
  criadoEm: string;
  _count: { usuarios: number };
};

const formVazio = { empresaNome: "", nome: "", email: "", senha: "" };
const formEdicaoVazio = { nome: "", slug: "" };
const formAdminVazio = { nome: "", email: "", senha: "" };

export default function PlataformaEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [formEdicao, setFormEdicao] = useState(formEdicaoVazio);
  const [logoFileEdicao, setLogoFileEdicao] = useState<File | null>(null);
  const [erroEdicao, setErroEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [empresaNovoAdmin, setEmpresaNovoAdmin] = useState<Empresa | null>(null);
  const [formAdmin, setFormAdmin] = useState(formAdminVazio);
  const [erroAdmin, setErroAdmin] = useState("");
  const [salvandoAdmin, setSalvandoAdmin] = useState(false);

  async function enviarLogo(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("arquivo", file);
    const res = await fetch("/api/plataforma/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro ?? "Erro ao enviar logo.");
    return data.url as string;
  }

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
    try {
      const logoUrl = logoFile ? await enviarLogo(logoFile) : undefined;
      const res = await fetch("/api/plataforma/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao criar empresa.");
        return;
      }
      setModal(false);
      setForm(formVazio);
      setLogoFile(null);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar empresa.");
    } finally {
      setSalvando(false);
    }
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
    setLogoFileEdicao(null);
    setErroEdicao("");
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaEditando) return;
    setErroEdicao("");
    setSalvandoEdicao(true);
    try {
      const logoUrl = logoFileEdicao ? await enviarLogo(logoFileEdicao) : undefined;
      const res = await fetch(`/api/plataforma/empresas/${empresaEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formEdicao, logoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroEdicao(data.erro ?? "Erro ao salvar alterações.");
        return;
      }
      setEmpresaEditando(null);
      carregar();
    } catch (err) {
      setErroEdicao(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function abrirNovoAdmin(empresa: Empresa) {
    setEmpresaNovoAdmin(empresa);
    setFormAdmin(formAdminVazio);
    setErroAdmin("");
  }

  async function salvarNovoAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!empresaNovoAdmin) return;
    setErroAdmin("");
    setSalvandoAdmin(true);
    try {
      const res = await fetch(`/api/plataforma/empresas/${empresaNovoAdmin.id}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formAdmin),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroAdmin(data.erro ?? "Erro ao criar admin.");
        return;
      }
      setEmpresaNovoAdmin(null);
      carregar();
    } finally {
      setSalvandoAdmin(false);
    }
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
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      {e.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.logoUrl} alt="" className="h-6 w-6 rounded object-contain border border-slate-200" />
                      ) : (
                        <span className="h-6 w-6 rounded bg-slate-100 flex-shrink-0" />
                      )}
                      {e.nome}
                    </div>
                  </td>
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
                    <button
                      onClick={() => abrirNovoAdmin(e)}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      + Admin
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
            <form onSubmit={criar} method="post" action="#" className="space-y-3" autoComplete="off">
              <div className="hidden" aria-hidden="true">
                <input type="text" name="username" tabIndex={-1} />
                <input type="password" name="password" tabIndex={-1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa</label>
                <input
                  type="text"
                  value={form.empresaNome}
                  onChange={(e) => setForm({ ...form, empresaNome: e.target.value })}
                  required
                  autoComplete="off"
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
                  autoComplete="off"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  name="admin_email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="off"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha inicial</label>
                <input
                  type="password"
                  name="admin_senha"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Logo (opcional)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm hover:file:bg-slate-200"
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
            <form onSubmit={salvarEdicao} method="post" action="#" className="space-y-3">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Logo</label>
                {empresaEditando.logoUrl && !logoFileEdicao && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={empresaEditando.logoUrl} alt="" className="h-10 w-10 rounded object-contain border border-slate-200 mb-2" />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setLogoFileEdicao(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm hover:file:bg-slate-200"
                />
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

      {empresaNovoAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Novo admin</h2>
            <p className="text-xs text-slate-500 mb-4">
              Vinculado à empresa <strong>{empresaNovoAdmin.nome}</strong> ({empresaNovoAdmin.slug}).
            </p>
            <form onSubmit={salvarNovoAdmin} method="post" action="#" className="space-y-3" autoComplete="off">
              <div className="hidden" aria-hidden="true">
                <input type="text" name="username" tabIndex={-1} />
                <input type="password" name="password" tabIndex={-1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formAdmin.nome}
                  onChange={(e) => setFormAdmin({ ...formAdmin, nome: e.target.value })}
                  required
                  autoComplete="off"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  name="admin_email"
                  value={formAdmin.email}
                  onChange={(e) => setFormAdmin({ ...formAdmin, email: e.target.value })}
                  required
                  autoComplete="off"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha inicial</label>
                <input
                  type="password"
                  name="admin_senha"
                  value={formAdmin.senha}
                  onChange={(e) => setFormAdmin({ ...formAdmin, senha: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {erroAdmin && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroAdmin}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEmpresaNovoAdmin(null); setErroAdmin(""); }}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAdmin}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
                >
                  {salvandoAdmin ? "Criando..." : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

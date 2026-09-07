"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Plus, Pencil, Trash2, Camera } from "lucide-react";

type Perfil = "PLATAFORMA" | "SUPERADMIN" | "PROFESSORA" | "SUPERADMIN_PROFESSORA" | "AUXILIAR";

const PERFIL_LABEL: Record<Perfil, string> = {
  PLATAFORMA: "Plataforma",
  SUPERADMIN: "Administrador",
  PROFESSORA: "Professor",
  SUPERADMIN_PROFESSORA: "Administrador e Professor",
  AUXILIAR: "Auxiliar",
};

const PERFIL_COR: Record<Perfil, string> = {
  PLATAFORMA: "bg-indigo-100 text-indigo-700",
  SUPERADMIN: "bg-violet-100 text-violet-700",
  PROFESSORA: "bg-emerald-100 text-emerald-700",
  SUPERADMIN_PROFESSORA: "bg-violet-100 text-violet-700",
  AUXILIAR: "bg-amber-100 text-amber-700",
};

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  foto: string | null;
  whatsapp: string | null;
  criadoEm: string;
  empresa: { id: string; nome: string; slug: string } | null;
};

type Empresa = { id: string; nome: string; slug: string; ativo: boolean };

type FormUsuario = {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
  empresaId: string;
  ativo: boolean;
  foto: string;
  whatsapp: string;
};

const formVazio: FormUsuario = {
  nome: "", email: "", senha: "", perfil: "PROFESSORA", empresaId: "",
  ativo: true, foto: "", whatsapp: "",
};

function Avatar({ foto, nome, size = "md" }: { foto: string | null; nome: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "w-20 h-20 text-2xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={foto} alt={nome} className={`${sizeClass} rounded-full object-cover shrink-0 border-2 border-white shadow-sm`} />
    );
  }
  const iniciais = nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <div className={`${sizeClass} rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold shrink-0`}>
      {iniciais}
    </div>
  );
}

function FotoUpload({ foto, nome, onChange }: { foto: string; nome: string; onChange: (base64: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        <Avatar foto={foto || null} nome={nome || "U"} size="lg" />
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera size={20} className="text-white" />
        </div>
      </div>
      <button type="button" onClick={() => inputRef.current?.click()} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
        {foto ? "Alterar foto" : "Adicionar foto"}
      </button>
      {foto && (
        <button type="button" onClick={() => onChange("")} className="text-xs text-slate-400 hover:text-red-500">
          Remover foto
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function PlataformaUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FormUsuario>(formVazio);
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [erroDelete, setErroDelete] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  async function carregar() {
    setCarregandoLista(true);
    setErroLista("");
    try {
      const [resUsuarios, resEmpresas] = await Promise.all([
        fetch("/api/plataforma/usuarios"),
        fetch("/api/plataforma/empresas"),
      ]);
      const [dadosUsuarios, dadosEmpresas] = await Promise.all([resUsuarios.json(), resEmpresas.json()]);
      if (!resUsuarios.ok) throw new Error(dadosUsuarios?.erro ?? "Erro ao carregar usuários.");
      if (!resEmpresas.ok) throw new Error(dadosEmpresas?.erro ?? "Erro ao carregar empresas.");
      setUsuarios(dadosUsuarios);
      setEmpresas(dadosEmpresas);
    } catch (err: any) {
      setErroLista(err?.message ?? "Erro ao carregar dados.");
    } finally {
      setCarregandoLista(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm(formVazio);
    setEditId(null);
    setErro("");
    setMostrarSenha(false);
    setModal(true);
  }

  function abrirEdit(u: Usuario) {
    setForm({
      nome: u.nome,
      email: u.email,
      senha: "",
      perfil: u.perfil,
      empresaId: u.empresa?.id ?? "",
      ativo: u.ativo,
      foto: u.foto ?? "",
      whatsapp: u.whatsapp ?? "",
    });
    setEditId(u.id);
    setErro("");
    setMostrarSenha(false);
    setModal(true);
  }

  async function salvar() {
    setErro("");
    if (!form.nome || !form.email) {
      setErro("Nome e e-mail são obrigatórios.");
      return;
    }
    if (!editId && (!form.senha || form.senha.length < 6)) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (editId && form.senha && form.senha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (form.perfil !== "PLATAFORMA" && !form.empresaId) {
      setErro("Escolha a empresa para esse perfil.");
      return;
    }
    setSalvando(true);
    try {
      const url = editId ? `/api/plataforma/usuarios/${editId}` : "/api/plataforma/usuarios";
      const method = editId ? "PATCH" : "POST";
      const body: any = {
        nome: form.nome,
        email: form.email,
        perfil: form.perfil,
        empresaId: form.perfil === "PLATAFORMA" ? null : form.empresaId,
        ativo: form.ativo,
        foto: form.foto,
        whatsapp: form.whatsapp,
      };
      if (form.senha) body.senha = form.senha;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao salvar.");
        return;
      }
      await carregar();
      setModal(false);
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

  async function confirmarExclusao() {
    if (!confirmDelete) return;
    setErroDelete("");
    setExcluindo(true);
    try {
      const res = await fetch(`/api/plataforma/usuarios/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setErroDelete(data.erro ?? "Erro ao excluir.");
        return;
      }
      setConfirmDelete(null);
      await carregar();
    } finally {
      setExcluindo(false);
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (!filtroEmpresa) return true;
    if (filtroEmpresa === "PLATAFORMA") return !u.empresa;
    return u.empresa?.id === filtroEmpresa;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Usuários</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro central de todos os usuários — internos da plataforma e de cada empresa.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todas as empresas</option>
            <option value="PLATAFORMA">Plataforma (sem empresa)</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Novo usuário
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {carregandoLista ? (
          <p className="p-6 text-sm text-slate-500">Carregando...</p>
        ) : erroLista ? (
          <div className="p-6 text-sm text-red-600 bg-red-50">
            {erroLista}
            <button onClick={carregar} className="ml-3 underline font-medium hover:text-red-700">
              Tentar novamente
            </button>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nenhum usuário encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Usuário</th>
                <th className="text-left px-4 py-2.5 hidden md:table-cell">E-mail</th>
                <th className="text-left px-4 py-2.5 hidden lg:table-cell">WhatsApp</th>
                <th className="text-left px-4 py-2.5">Empresa</th>
                <th className="text-left px-4 py-2.5">Perfil</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosFiltrados.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar foto={u.foto} nome={u.nome} size="sm" />
                      <span className="font-medium text-slate-800">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {u.whatsapp ? (
                      <a href={`https://wa.me/${u.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 font-medium">
                        {u.whatsapp}
                      </a>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.empresa ? (
                      <span className="text-slate-700">{u.empresa.nome}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PERFIL_COR[u.perfil]}`}>
                      {PERFIL_LABEL[u.perfil]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => abrirEdit(u)} className="text-xs text-indigo-600 hover:underline font-medium">
                      Editar
                    </button>
                    <button onClick={() => alternarAtivo(u.id, u.ativo)} className="text-xs text-indigo-600 hover:underline font-medium">
                      {u.ativo ? "Desativar" : "Ativar"}
                    </button>
                    {(u.perfil === "PROFESSORA" || u.perfil === "AUXILIAR" || u.perfil === "SUPERADMIN_PROFESSORA") && (
                      <button
                        onClick={() => { setErroDelete(""); setConfirmDelete({ id: u.id, nome: u.nome }); }}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Criar / Editar ──────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-0">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                {editId ? "Editar usuário" : "Novo usuário"}
              </h2>
            </div>
            <div className="px-6 pb-6">
              <>
                <div className="flex justify-center mb-5">
                  <FotoUpload foto={form.foto} nome={form.nome} onChange={(base64) => setForm({ ...form, foto: base64 })} />
                </div>
                <div className="space-y-3">
                  {/* Campos-isca: absorvem o autofill do navegador antes dos campos reais. */}
                  <div className="hidden" aria-hidden="true">
                    <input type="text" name="username" tabIndex={-1} />
                    <input type="password" name="password" tabIndex={-1} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                    <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Nome completo" autoComplete="off"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">E-mail *</label>
                    <input type="email" name="usuario_email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemplo.com" autoComplete="off"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp</label>
                    <input type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      placeholder="(11) 99999-9999" autoComplete="off"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {editId ? "Nova senha (deixe em branco para manter)" : "Senha *"}
                    </label>
                    <div className="relative">
                      <input type={mostrarSenha ? "text" : "password"} name="usuario_senha" value={form.senha}
                        onChange={(e) => setForm({ ...form, senha: e.target.value })}
                        placeholder={editId ? "Deixe em branco para não alterar" : "Mínimo 6 caracteres"}
                        autoComplete="new-password"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={() => setMostrarSenha((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                        {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Perfil *</label>
                      <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="PROFESSORA">Professor</option>
                        <option value="AUXILIAR">Auxiliar</option>
                        <option value="SUPERADMIN">Administrador</option>
                        <option value="SUPERADMIN_PROFESSORA">Administrador/Professor</option>
                        <option value="PLATAFORMA">Plataforma (interno)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <select value={form.ativo ? "true" : "false"} onChange={(e) => setForm({ ...form, ativo: e.target.value === "true" })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="true">Ativo</option>
                        <option value="false">Desativado</option>
                      </select>
                    </div>
                  </div>
                  {form.perfil !== "PLATAFORMA" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Empresa *</label>
                      <select value={form.empresaId} onChange={(e) => setForm({ ...form, empresaId: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="">Selecione a empresa</option>
                        {empresas.map((e) => (
                          <option key={e.id} value={e.id}>{e.nome}{e.ativo ? "" : " (inativa)"}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erro}</p>}
                <div className="flex gap-3 mt-5">
                  <button onClick={salvar} disabled={salvando}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                    {salvando ? "Salvando..." : editId ? "Salvar dados" : "Criar usuário"}
                  </button>
                  <button onClick={() => { setModal(false); setErro(""); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">
                    Cancelar
                  </button>
                </div>
              </>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ──────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir o usuário <strong>{confirmDelete.nome}</strong>? Aulas e agenda vinculadas a ele também serão removidas.
            </p>
            {erroDelete && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroDelete}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={confirmarExclusao} disabled={excluindo}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
              <button onClick={() => { setConfirmDelete(null); setErroDelete(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

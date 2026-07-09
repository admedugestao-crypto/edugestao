"use client";

import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, Camera, ShieldCheck, GraduationCap, Eye, EyeOff, PlusCircle, X } from "lucide-react";

type Horario = { dia: string; inicio: string; fim: string };

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

type Perfil = "SUPERADMIN" | "PROFESSORA";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  foto: string | null;
  whatsapp: string | null;
  criadoEm: string;
  disponibilidade: Horario[];
};

type FormUsuario = {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil | "";
  ativo: boolean;
  foto: string;
  whatsapp: string;
  disponibilidade: Horario[];
};

const formVazio: FormUsuario = {
  nome: "",
  email: "",
  senha: "",
  perfil: "PROFESSORA",
  ativo: true,
  foto: "",
  whatsapp: "",
  disponibilidade: [],
};

function perfilLabel(perfil: Perfil) {
  return perfil === "SUPERADMIN" ? "Administrador" : "Professor";
}

function PerfilBadge({ perfil }: { perfil: Perfil }) {
  if (perfil === "SUPERADMIN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
        <ShieldCheck size={11} />
        Administrador
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <GraduationCap size={11} />
      Professor
    </span>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ativo ? "bg-green-500" : "bg-slate-400"}`} />
      {ativo ? "Ativo" : "Desativado"}
    </span>
  );
}

function Avatar({ foto, nome, size = "md" }: { foto: string | null; nome: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "w-20 h-20 text-2xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  if (foto) {
    return (
      <img
        src={foto}
        alt={nome}
        className={`${sizeClass} rounded-full object-cover shrink-0 border-2 border-white shadow-sm`}
      />
    );
  }
  const iniciais = nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className={`${sizeClass} rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold shrink-0`}
    >
      {iniciais}
    </div>
  );
}

function FotoUpload({
  foto,
  nome,
  onChange,
}: {
  foto: string;
  nome: string;
  onChange: (base64: string) => void;
}) {
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        {foto ? "Alterar foto" : "Adicionar foto"}
      </button>
      {foto && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-slate-400 hover:text-red-500"
        >
          Remover foto
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

export default function UsuariosClient({
  usuariosIniciais,
  sessionUserId,
}: {
  usuariosIniciais: Usuario[];
  sessionUserId: string;
}) {
  const [usuarios, setUsuarios] = useState(usuariosIniciais);
  const [modal, setModal] = useState(false);
  const [abaModal, setAbaModal] = useState<"dados" | "disponibilidade">("dados");
  const [form, setForm] = useState<FormUsuario>(formVazio);
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [erroDelete, setErroDelete] = useState("");
  const [erro, setErro] = useState("");
  const [erroDisp, setErroDisp] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvandoDisp, setSalvandoDisp] = useState(false);

  async function carregar() {
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsuarios(await res.json());
  }

  function abrirNovo() {
    setForm(formVazio);
    setEditId(null);
    setErro("");
    setErroDisp("");
    setAbaModal("dados");
    setModal(true);
  }

  function abrirEdit(u: Usuario) {
    setForm({
      nome: u.nome,
      email: u.email,
      senha: "",
      perfil: u.perfil,
      ativo: u.ativo,
      foto: u.foto ?? "",
      whatsapp: u.whatsapp ?? "",
      disponibilidade: u.disponibilidade ?? [],
    });
    setEditId(u.id);
    setErro("");
    setErroDisp("");
    setAbaModal("dados");
    setModal(true);
  }

  async function salvarDisponibilidade() {
    setErroDisp("");
    if (!editId) return;
    for (let i = 0; i < form.disponibilidade.length; i++) {
      const h = form.disponibilidade[i];
      if (h.inicio >= h.fim) {
        setErroDisp(`Hora fim deve ser maior que hora início (${h.dia}).`);
        return;
      }
      for (let j = i + 1; j < form.disponibilidade.length; j++) {
        const o = form.disponibilidade[j];
        if (h.dia === o.dia && h.inicio < o.fim && o.inicio < h.fim) {
          setErroDisp(`Conflito em ${h.dia}: ${h.inicio}–${h.fim} sobrepõe ${o.inicio}–${o.fim}.`);
          return;
        }
      }
    }
    setSalvandoDisp(true);
    try {
      const res = await fetch(`/api/usuarios/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, disponibilidade: form.disponibilidade }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErroDisp(data.erro ?? "Erro ao salvar.");
        return;
      }
      await carregar();
      setErroDisp("✓ Disponibilidade salva com sucesso!");
      setTimeout(() => setErroDisp(""), 3000);
    } finally {
      setSalvandoDisp(false);
    }
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
    if (form.perfil === "PROFESSORA" && form.disponibilidade.length === 0) {
      setErro("Professor(a) deve ter pelo menos um horário de disponibilidade cadastrado.");
      setAbaModal("disponibilidade");
      return;
    }

    setSalvando(true);
    try {
      const url = editId ? `/api/usuarios/${editId}` : "/api/usuarios";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  async function confirmarExclusao() {
    if (!confirmDelete) return;
    setErroDelete("");
    setSalvando(true);
    const res = await fetch(`/api/usuarios/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroDelete(data.erro ?? "Erro ao excluir.");
      setSalvando(false);
      return;
    }
    setUsuarios((prev) => prev.filter((u) => u.id !== confirmDelete.id));
    setConfirmDelete(null);
    setSalvando(false);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={abrirNovo}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <Plus size={15} />
        Novo usuário
      </button>

      {/* ── Lista de usuários ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {usuarios.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Usuário</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 hidden md:table-cell">E-mail</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 hidden lg:table-cell">WhatsApp</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Perfil</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar foto={u.foto} nome={u.nome} size="sm" />
                      <span className="font-medium text-slate-800">{u.nome}</span>
                      {u.id === sessionUserId && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                          Você
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{u.email}</td>
                  <td className="py-3 px-4 text-slate-500 hidden lg:table-cell">
                    {u.whatsapp ? (
                      <a
                        href={`https://wa.me/${u.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        {u.whatsapp}
                      </a>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <PerfilBadge perfil={u.perfil} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge ativo={u.ativo} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => abrirEdit(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setErroDelete("");
                          setConfirmDelete({ id: u.id, nome: u.nome });
                        }}
                        disabled={u.id === sessionUserId}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.id === sessionUserId ? "Não é possível excluir o próprio usuário" : "Excluir"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
            {/* Cabeçalho + abas */}
            <div className="px-6 pt-6 pb-0">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                {editId ? "Editar usuário" : "Novo usuário"}
              </h2>
              {(editId || form.perfil === "PROFESSORA") && (
                <div className="flex border-b border-slate-200 mb-5">
                  {(["dados", "disponibilidade"] as const).map((aba) => (
                    <button
                      key={aba}
                      onClick={() => setAbaModal(aba)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        abaModal === aba
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {aba === "dados" ? "Dados" : "Disponibilidade"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 pb-6">

            {/* ── Aba Dados ── */}
            {abaModal === "dados" && (
              <>
                <div className="flex justify-center mb-5">
                  <FotoUpload
                    foto={form.foto}
                    nome={form.nome}
                    onChange={(base64) => setForm({ ...form, foto: base64 })}
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                    <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Nome completo"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">E-mail *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp</label>
                    <input type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {editId ? "Nova senha (deixe em branco para manter)" : "Senha *"}
                    </label>
                    <div className="relative">
                      <input type={mostrarSenha ? "text" : "password"} value={form.senha}
                        onChange={(e) => setForm({ ...form, senha: e.target.value })}
                        placeholder={editId ? "Deixe em branco para não alterar" : "Mínimo 6 caracteres"}
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
                        <option value="SUPERADMIN">Administrador</option>
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
            )}

            {/* ── Aba Disponibilidade ── */}
            {abaModal === "disponibilidade" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-slate-500">Horários disponíveis para atendimento por dia da semana.</p>
                  <button type="button"
                    onClick={() => setForm({ ...form, disponibilidade: [...form.disponibilidade, { dia: "Segunda", inicio: "08:00", fim: "12:00" }] })}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 ml-3">
                    <PlusCircle size={13}/> Adicionar
                  </button>
                </div>
                {form.disponibilidade.length === 0 && (
                  <p className="text-xs text-slate-400 italic mb-4">Nenhum horário cadastrado.</p>
                )}
                <div className="space-y-2 mb-4">
                  {form.disponibilidade.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                      <select value={h.dia}
                        onChange={(e) => { const d = [...form.disponibilidade]; d[i] = { ...d[i], dia: e.target.value }; setForm({ ...form, disponibilidade: d }); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input type="time" value={h.inicio}
                        onChange={(e) => { const d = [...form.disponibilidade]; d[i] = { ...d[i], inicio: e.target.value }; setForm({ ...form, disponibilidade: d }); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <span className="text-xs text-slate-400">até</span>
                      <input type="time" value={h.fim}
                        onChange={(e) => { const d = [...form.disponibilidade]; d[i] = { ...d[i], fim: e.target.value }; setForm({ ...form, disponibilidade: d }); }}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button"
                        onClick={() => setForm({ ...form, disponibilidade: form.disponibilidade.filter((_, j) => j !== i) })}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-auto">
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
                {erroDisp && (
                  <p className={`text-sm rounded-lg px-3 py-2 mb-3 ${erroDisp.startsWith("✓") ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
                    {erroDisp}
                  </p>
                )}
                <div className="flex gap-3">
                  {editId ? (
                    <>
                      <button onClick={salvarDisponibilidade} disabled={salvandoDisp}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                        {salvandoDisp ? "Salvando..." : "Salvar disponibilidade"}
                      </button>
                      <button onClick={() => { setModal(false); setErroDisp(""); }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">
                        Fechar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setAbaModal("dados")}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">
                      Voltar para Dados
                    </button>
                  )}
                </div>
              </>
            )}

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
              Tem certeza que deseja excluir o usuário{" "}
              <strong>{confirmDelete.nome}</strong>?
            </p>
            {erroDelete && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroDelete}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={confirmarExclusao}
                disabled={salvando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Excluindo..." : "Excluir"}
              </button>
              <button
                onClick={() => { setConfirmDelete(null); setErroDelete(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

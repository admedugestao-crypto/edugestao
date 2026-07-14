"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, Paperclip, X, Loader2, Home, LogOut,
  Search, FileText, Download,
} from "lucide-react";
import { SERIES } from "@/lib/series";

type Materia = { id: string; nome: string; cor: string };

type Material = {
  id: string;
  titulo: string;
  descricao: string | null;
  metodo: string | null;
  serie: string | null;
  materiaId: string | null;
  materia: Materia | null;
  arquivoUrl: string;
  arquivoNome: string | null;
};

type Form = {
  titulo: string;
  descricao: string;
  metodo: string;
  serie: string;
  materiaId: string;
  arquivoUrl: string;
  arquivoNome: string;
};

const formVazio: Form = {
  titulo: "", descricao: "", metodo: "", serie: "", materiaId: "", arquivoUrl: "", arquivoNome: "",
};

export default function BibliotecaMobile({
  nomeUsuario,
  materiaisIniciais,
  materias,
}: {
  nomeUsuario: string;
  materiaisIniciais: Material[];
  materias: Materia[];
}) {
  const router = useRouter();
  const [materiais, setMateriais] = useState(materiaisIniciais);
  const [busca, setBusca] = useState("");
  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroMateriaId, setFiltroMateriaId] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(formVazio);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; titulo: string } | null>(null);

  const materiaisFiltrados = materiais.filter((m) => {
    if (filtroSerie && m.serie !== filtroSerie) return false;
    if (filtroMateriaId && m.materiaId !== filtroMateriaId) return false;
    if (busca) {
      const termo = busca.trim().toLowerCase();
      const noTitulo = m.titulo.toLowerCase().includes(termo);
      const naDescricao = (m.descricao ?? "").toLowerCase().includes(termo);
      if (!noTitulo && !naDescricao) return false;
    }
    return true;
  });

  async function onUpload(file: File) {
    setEnviandoArquivo(true);
    setErro("");
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro ?? "Erro ao enviar arquivo."); return; }
      setForm((p) => ({ ...p, arquivoUrl: data.url, arquivoNome: data.nome }));
    } finally {
      setEnviandoArquivo(false);
    }
  }

  function abrirNovo() {
    setErro("");
    setEditandoId(null);
    setForm(formVazio);
    setModalAberto(true);
  }

  function abrirEditar(m: Material) {
    setErro("");
    setEditandoId(m.id);
    setForm({
      titulo: m.titulo,
      descricao: m.descricao ?? "",
      metodo: m.metodo ?? "",
      serie: m.serie ?? "",
      materiaId: m.materiaId ?? "",
      arquivoUrl: m.arquivoUrl,
      arquivoNome: m.arquivoNome ?? "",
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.titulo || !form.arquivoUrl) return;
    setSalvando(true);
    setErro("");
    try {
      const url = editandoId ? `/api/biblioteca/${editandoId}` : "/api/biblioteca";
      const res = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro ?? "Erro ao salvar."); return; }
      setMateriais((prev) =>
        editandoId ? prev.map((m) => (m.id === data.id ? data : m)) : [data, ...prev]
      );
      setModalAberto(false);
      setForm(formVazio);
      setEditandoId(null);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirmDelete) return;
    setSalvando(true);
    try {
      await fetch(`/api/biblioteca/${confirmDelete.id}`, { method: "DELETE" });
      setMateriais((prev) => prev.filter((m) => m.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-slate-100 select-none overflow-hidden">
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="bg-indigo-600 text-white px-4 pt-safe pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/m")} className="opacity-75 hover:opacity-100">
            <Home size={18}/>
          </button>
          <div>
            <p className="text-xs opacity-75">EduGestão</p>
            <p className="text-sm font-bold leading-tight truncate max-w-[160px]">{nomeUsuario}</p>
          </div>
        </div>
        <button onClick={() => router.push("/api/auth/signout")} className="opacity-75 hover:opacity-100">
          <LogOut size={18}/>
        </button>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 shrink-0 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <select value={filtroSerie} onChange={(e) => setFiltroSerie(e.target.value)}
            className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas as séries</option>
            {SERIES.flatMap((g) => g.opcoes).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroMateriaId} onChange={(e) => setFiltroMateriaId(e.target.value)}
            className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas as disciplinas</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
      </div>

      {/* ── Lista ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-24">
        {materiaisFiltrados.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-16">Nenhum material encontrado.</div>
        ) : (
          materiaisFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{m.titulo}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[m.metodo, m.serie, m.materia?.nome].filter(Boolean).join(" · ") || "Sem categorização"}
                  </p>
                </div>
              </div>
              {m.descricao && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{m.descricao}</p>}
              <div className="flex items-center gap-1 mt-2.5">
                <a href={m.arquivoUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg py-2 active:bg-indigo-50">
                  <Download size={13}/> Baixar
                </a>
                <button onClick={() => abrirEditar(m)}
                  className="p-2 rounded-lg text-slate-400 active:bg-slate-100">
                  <Pencil size={15}/>
                </button>
                <button onClick={() => setConfirmDelete({ id: m.id, titulo: m.titulo })}
                  className="p-2 rounded-lg text-slate-400 active:bg-red-50">
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── FAB Novo material ────────────────────────────────────────────── */}
      <button onClick={abrirNovo}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40">
        <Plus size={24}/>
      </button>

      {/* ── Modal Novo/Editar ────────────────────────────────────────────── */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[88vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800">{editandoId ? "Editar material" : "Novo material"}</h2>
              <button onClick={() => { setModalAberto(false); setForm(formVazio); setEditandoId(null); }}>
                <X size={20} className="text-slate-400"/>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Título *</label>
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: Apostila de frações" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
                <textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Método</label>
                  <input value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: Singapura" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Série</label>
                  <select value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="">Todas</option>
                    {SERIES.map((g) => (
                      <optgroup key={g.grupo} label={g.grupo}>
                        {g.opcoes.map((s) => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Disciplina</label>
                <select value={form.materiaId} onChange={(e) => setForm({ ...form, materiaId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white">
                  <option value="">Nenhuma</option>
                  {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Arquivo *</label>
                {form.arquivoUrl ? (
                  <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2.5">
                    <span className="text-sm text-slate-600 truncate flex items-center gap-1.5">
                      <Paperclip size={14} className="shrink-0"/> {form.arquivoNome || "arquivo"}
                    </span>
                    <button type="button" onClick={() => setForm({ ...form, arquivoUrl: "", arquivoNome: "" })}>
                      <X size={16} className="text-slate-400"/>
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-500 cursor-pointer">
                    {enviandoArquivo ? <Loader2 size={16} className="animate-spin"/> : <Paperclip size={16}/>}
                    {enviandoArquivo ? "Enviando..." : "Anexar arquivo"}
                    <input type="file" className="hidden" disabled={enviandoArquivo}
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}/>
                  </label>
                )}
              </div>
            </div>
            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erro}</p>}
            <button onClick={salvar} disabled={!form.titulo || !form.arquivoUrl || salvando || enviandoArquivo}
              className="w-full bg-indigo-600 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm mt-4">
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Criar material"}
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmar exclusão ───────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <h2 className="font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">Excluir <strong>{confirmDelete.titulo}</strong>?</p>
            <div className="flex gap-3 mt-4">
              <button onClick={excluir} disabled={salvando}
                className="flex-1 bg-red-600 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl text-sm">
                {salvando ? "Excluindo..." : "Excluir"}
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded-xl text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

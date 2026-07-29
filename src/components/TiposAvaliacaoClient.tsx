"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

type TipoAvaliacao = { id: string; nome: string };

export default function TiposAvaliacaoClient({
  tiposIniciais,
}: {
  tiposIniciais: TipoAvaliacao[];
}) {
  const [tipos, setTipos] = useState(tiposIniciais);
  const [modal, setModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [editando, setEditando] = useState<TipoAvaliacao | null>(null);
  const [erroEdit, setErroEdit] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<TipoAvaliacao | null>(null);
  const [erroDelete, setErroDelete] = useState("");

  async function criarTipo() {
    if (!novoNome.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/tipos-avaliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao criar tipo.");
        return;
      }
      setTipos((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setModal(false);
      setNovoNome("");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao() {
    if (!editando || !editando.nome.trim()) return;
    setSalvando(true);
    setErroEdit("");
    try {
      const res = await fetch(`/api/tipos-avaliacao/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editando.nome.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroEdit(data.erro ?? "Erro ao salvar.");
        return;
      }
      setTipos((prev) => prev.map((t) => (t.id === data.id ? data : t)).sort((a, b) => a.nome.localeCompare(b.nome)));
      setEditando(null);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirTipo() {
    if (!confirmDelete) return;
    setSalvando(true);
    setErroDelete("");
    try {
      const res = await fetch(`/api/tipos-avaliacao/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setErroDelete(data.erro ?? "Erro ao excluir.");
        return;
      }
      setTipos((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {tipos.length} tipo{tipos.length !== 1 ? "s" : ""} cadastrado{tipos.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => { setErro(""); setNovoNome(""); setModal(true); }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Novo tipo
          </button>
        </div>

        {tipos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum tipo cadastrado ainda.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {tipos.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-slate-700">{t.nome}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setErroEdit(""); setEditando({ ...t }); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { setErroDelete(""); setConfirmDelete(t); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Novo Tipo ────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Novo tipo de avaliação</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Trabalho"
                autoFocus
              />
            </div>
            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erro}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={criarTipo}
                disabled={!novoNome.trim() || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Criar"}
              </button>
              <button
                onClick={() => setModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Tipo ─────────────────────────────────────────────── */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar tipo</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
              <input
                value={editando.nome}
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            {erroEdit && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroEdit}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={salvarEdicao}
                disabled={!editando.nome.trim() || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => setEditando(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ──────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir o tipo <strong>{confirmDelete.nome}</strong>?
            </p>
            <p className="text-xs text-slate-400 mt-1">Não é possível excluir se já houver avaliações cadastradas com esse tipo.</p>
            {erroDelete && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroDelete}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={excluirTipo}
                disabled={salvando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Excluindo..." : "Excluir"}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
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

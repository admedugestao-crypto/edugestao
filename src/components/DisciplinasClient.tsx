"use client";

import { useState } from "react";
import { Plus, Check, Pencil, Trash2 } from "lucide-react";

type Materia = { id: string; nome: string; cor: string };

const CORES = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
];

export default function DisciplinasClient({
  todasMaterias,
  minhasIdsIniciais,
  professoraId,
}: {
  todasMaterias: Materia[];
  minhasIdsIniciais: string[];
  professoraId: string;
}) {
  const [materias, setMaterias] = useState(todasMaterias);
  const [minhasIds, setMinhasIds] = useState(new Set(minhasIdsIniciais));
  const [modal, setModal] = useState(false);
  const [nova, setNova] = useState({ nome: "", cor: CORES[0] });
  const [salvando, setSalvando] = useState(false);

  const [editMateria, setEditMateria] = useState<Materia | null>(null);
  const [erroEdit, setErroEdit] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Materia | null>(null);
  const [erroDelete, setErroDelete] = useState("");

  async function toggleMateria(id: string) {
    const ativa = minhasIds.has(id);
    const method = ativa ? "DELETE" : "POST";
    await fetch(`/api/professoras/${professoraId}/materias`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materiaId: id }),
    });
    setMinhasIds((prev) => {
      const next = new Set(prev);
      ativa ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function criarMateria() {
    setSalvando(true);
    const res = await fetch("/api/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nova),
    });
    const materia = await res.json();
    setMaterias((prev) => [...prev, materia]);
    await toggleMateria(materia.id);
    setModal(false);
    setNova({ nome: "", cor: CORES[0] });
    setSalvando(false);
  }

  async function salvarMateria() {
    if (!editMateria) return;
    setErroEdit("");
    setSalvando(true);
    try {
      const res = await fetch(`/api/materias/${editMateria.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editMateria.nome, cor: editMateria.cor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroEdit(data.erro ?? `Erro ${res.status} ao salvar.`);
        return;
      }
      setMaterias((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      setEditMateria(null);
      setErroEdit("");
    } catch (e) {
      setErroEdit("Erro de conexão ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMateria() {
    if (!confirmDelete) return;
    setErroDelete("");
    setSalvando(true);
    const res = await fetch(`/api/materias/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroDelete(data.erro ?? "Erro ao excluir.");
      setSalvando(false);
      return;
    }
    setMaterias((prev) => prev.filter((m) => m.id !== confirmDelete.id));
    setMinhasIds((prev) => { const next = new Set(prev); next.delete(confirmDelete.id); return next; });
    setConfirmDelete(null);
    setSalvando(false);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
          Clique no nome para ativar / desativar
        </p>
        <div className="flex flex-wrap gap-2">
          {materias.map((m) => {
            const ativa = minhasIds.has(m.id);
            return (
              <div key={m.id} className="flex items-center gap-0.5">
                <button
                  onClick={() => toggleMateria(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-sm font-medium border transition-all ${
                    ativa
                      ? "text-white border-transparent"
                      : "text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                  style={ativa ? { backgroundColor: m.cor } : { borderColor: m.cor }}
                >
                  {ativa ? (
                    <Check size={12} />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.cor }} />
                  )}
                  {m.nome}
                </button>
                <button
                  onClick={() => { setErroEdit(""); setEditMateria({ ...m }); }}
                  className={`px-1.5 py-1.5 border-y transition-colors ${
                    ativa
                      ? "border-transparent bg-black/10 text-white hover:bg-black/20"
                      : "border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  }`}
                  title="Editar"
                  style={ativa ? { backgroundColor: `${m.cor}cc` } : {}}
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => { setErroDelete(""); setConfirmDelete(m); }}
                  className={`px-1.5 py-1.5 rounded-r-full border transition-colors ${
                    ativa
                      ? "border-transparent bg-black/10 text-white hover:bg-black/20"
                      : "border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  }`}
                  title="Excluir"
                  style={ativa ? { backgroundColor: `${m.cor}cc` } : {}}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus size={13} />
            Nova disciplina
          </button>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
        <p className="text-sm font-medium text-indigo-800">
          {minhasIds.size} disciplina{minhasIds.size !== 1 ? "s" : ""} ativa{minhasIds.size !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-indigo-600 mt-0.5">
          Essas disciplinas aparecerão ao cadastrar novos alunos.
        </p>
      </div>

      {/* ── Modal Nova Disciplina ─────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Nova disciplina</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                <input
                  value={nova.nome}
                  onChange={(e) => setNova({ ...nova, nome: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Química"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {CORES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNova({ ...nova, cor: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        nova.cor === c ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: nova.cor }}
                >
                  {nova.nome || "Prévia"}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={criarMateria}
                disabled={!nova.nome || salvando}
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

      {/* ── Modal Editar Disciplina ───────────────────────────────────────── */}
      {editMateria && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar disciplina</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                <input
                  value={editMateria.nome}
                  onChange={(e) => setEditMateria({ ...editMateria, nome: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {CORES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditMateria({ ...editMateria, cor: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        editMateria.cor === c ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: editMateria.cor }}
                >
                  {editMateria.nome}
                </span>
              </div>
            </div>
            {erroEdit && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroEdit}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={salvarMateria}
                disabled={!editMateria.nome || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => { setEditMateria(null); setErroEdit(""); }}
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
              Tem certeza que deseja excluir a disciplina{" "}
              <strong>{confirmDelete.nome}</strong>?
            </p>
            {erroDelete && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroDelete}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={excluirMateria}
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

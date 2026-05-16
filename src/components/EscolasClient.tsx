"use client";

import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, MapPin, Building2, Pencil, Trash2 } from "lucide-react";

type Unidade = {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  turno: string | null;
};

type Escola = {
  id: string;
  nome: string;
  rede: string | null;
  periodoAvaliacao: string | null;
  unidades: Unidade[];
};

const PERIODOS_AVALIACAO = ["Bimestral", "Trimestral", "Semestral"] as const;

type ConfirmDelete = { tipo: "escola"; id: string; nome: string } | { tipo: "unidade"; id: string; escolaId: string; nome: string };

export default function EscolasClient({ escolasIniciais }: { escolasIniciais: Escola[] }) {
  const [escolas, setEscolas] = useState(escolasIniciais);
  const [expandida, setExpandida] = useState<string | null>(null);

  // modais criar
  const [modalEscola, setModalEscola] = useState(false);
  const [modalUnidade, setModalUnidade] = useState<string | null>(null);
  const [novaEscola, setNovaEscola] = useState({ nome: "", rede: "", periodoAvaliacao: "" });
  const [primeiraUnidade, setPrimeiraUnidade] = useState({ nome: "", cidade: "", estado: "", turno: "" });
  const [novaUnidade, setNovaUnidade] = useState({ nome: "", cidade: "", estado: "", turno: "" });

  // modais editar
  const [editEscola, setEditEscola] = useState<{ id: string; nome: string; rede: string; periodoAvaliacao: string } | null>(null);
  const [editUnidade, setEditUnidade] = useState<{ id: string; escolaId: string; nome: string; cidade: string; estado: string; turno: string } | null>(null);

  // confirmação de exclusão
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null);
  const [erroDelete, setErroDelete] = useState("");

  const [salvando, setSalvando] = useState(false);

  // ── Criar escola (+ primeira unidade) ──────────────────────────────────────
  async function criarEscola() {
    setSalvando(true);
    const res = await fetch("/api/escolas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novaEscola.nome, rede: novaEscola.rede, periodoAvaliacao: novaEscola.periodoAvaliacao }),
    });
    const escola: Escola = await res.json();

    if (primeiraUnidade.nome) {
      const resU = await fetch(`/api/escolas/${escola.id}/unidades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(primeiraUnidade),
      });
      const unidade = await resU.json();
      escola.unidades = [unidade];
    }

    setEscolas((prev) => [...prev, escola]);
    setModalEscola(false);
    setNovaEscola({ nome: "", rede: "", periodoAvaliacao: "" });
    setPrimeiraUnidade({ nome: "", cidade: "", estado: "", turno: "" });
    setSalvando(false);
  }

  // ── Criar unidade extra ────────────────────────────────────────────────────
  async function criarUnidade(escolaId: string) {
    setSalvando(true);
    const res = await fetch(`/api/escolas/${escolaId}/unidades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novaUnidade),
    });
    const unidade = await res.json();
    setEscolas((prev) =>
      prev.map((e) => (e.id === escolaId ? { ...e, unidades: [...e.unidades, unidade] } : e))
    );
    setModalUnidade(null);
    setNovaUnidade({ nome: "", cidade: "", estado: "", turno: "" });
    setSalvando(false);
  }

  // ── Editar escola ──────────────────────────────────────────────────────────
  async function salvarEscola() {
    if (!editEscola) return;
    setSalvando(true);
    const res = await fetch(`/api/escolas/${editEscola.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: editEscola.nome, rede: editEscola.rede, periodoAvaliacao: editEscola.periodoAvaliacao }),
    });
    const atualizada = await res.json();
    setEscolas((prev) =>
      prev.map((e) => (e.id === atualizada.id ? { ...e, nome: atualizada.nome, rede: atualizada.rede } : e))
    );
    setEditEscola(null);
    setSalvando(false);
  }

  // ── Editar unidade ─────────────────────────────────────────────────────────
  async function salvarUnidade() {
    if (!editUnidade) return;
    setSalvando(true);
    const res = await fetch(`/api/escolas/${editUnidade.escolaId}/unidades/${editUnidade.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: editUnidade.nome,
        cidade: editUnidade.cidade,
        estado: editUnidade.estado,
        turno: editUnidade.turno,
      }),
    });
    const atualizada = await res.json();
    setEscolas((prev) =>
      prev.map((e) =>
        e.id === editUnidade.escolaId
          ? { ...e, unidades: e.unidades.map((u) => (u.id === atualizada.id ? atualizada : u)) }
          : e
      )
    );
    setEditUnidade(null);
    setSalvando(false);
  }

  // ── Excluir ────────────────────────────────────────────────────────────────
  async function confirmarExclusao() {
    if (!confirmDelete) return;
    setErroDelete("");
    setSalvando(true);

    let url = "";
    if (confirmDelete.tipo === "escola") {
      url = `/api/escolas/${confirmDelete.id}`;
    } else {
      url = `/api/escolas/${confirmDelete.escolaId}/unidades/${confirmDelete.id}`;
    }

    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroDelete(data.erro ?? "Erro ao excluir.");
      setSalvando(false);
      return;
    }

    if (confirmDelete.tipo === "escola") {
      setEscolas((prev) => prev.filter((e) => e.id !== confirmDelete.id));
    } else {
      setEscolas((prev) =>
        prev.map((e) =>
          e.id === confirmDelete.escolaId
            ? { ...e, unidades: e.unidades.filter((u) => u.id !== confirmDelete.id) }
            : e
        )
      );
    }

    setConfirmDelete(null);
    setSalvando(false);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setModalEscola(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <Plus size={15} />
        Nova escola
      </button>

      {escolas.map((escola) => (
        <div key={escola.id} className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 p-4">
            <button
              onClick={() => setExpandida(expandida === escola.id ? null : escola.id)}
              className="flex-1 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors rounded-lg -m-1 p-1"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{escola.nome}</p>
                <p className="text-xs text-slate-500">
                  {[escola.rede, escola.periodoAvaliacao].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="text-xs text-slate-500 mr-2">
                {escola.unidades.length} unidade{escola.unidades.length !== 1 ? "s" : ""}
              </span>
              {expandida === escola.id ? (
                <ChevronDown size={16} className="text-slate-400 shrink-0" />
              ) : (
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              )}
            </button>
            <button
              onClick={() => setEditEscola({ id: escola.id, nome: escola.nome, rede: escola.rede ?? "", periodoAvaliacao: escola.periodoAvaliacao ?? "" })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Editar escola"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => { setErroDelete(""); setConfirmDelete({ tipo: "escola", id: escola.id, nome: escola.nome }); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Excluir escola"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {expandida === escola.id && (
            <div className="border-t border-slate-100 p-4 space-y-2">
              {escola.unidades.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <MapPin size={15} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{u.nome}</p>
                    {(u.cidade || u.turno) && (
                      <p className="text-xs text-slate-500">
                        {[u.cidade, u.estado].filter(Boolean).join(", ")}
                        {u.turno ? ` · ${u.turno}` : ""}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setEditUnidade({
                        id: u.id,
                        escolaId: escola.id,
                        nome: u.nome,
                        cidade: u.cidade ?? "",
                        estado: u.estado ?? "",
                        turno: u.turno ?? "",
                      })
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Editar unidade"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { setErroDelete(""); setConfirmDelete({ tipo: "unidade", id: u.id, escolaId: escola.id, nome: u.nome }); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Excluir unidade"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setModalUnidade(escola.id)}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2"
              >
                <Plus size={14} />
                Adicionar unidade
              </button>
            </div>
          )}
        </div>
      ))}

      {/* ── Modal Nova Escola ───────────────────────────────────────────────── */}
      {modalEscola && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Nova Escola</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                <input
                  value={novaEscola.nome}
                  onChange={(e) => setNovaEscola({ ...novaEscola, nome: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Colégio Dom Bosco"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rede / Grupo</label>
                <input
                  value={novaEscola.rede}
                  onChange={(e) => setNovaEscola({ ...novaEscola, rede: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Particular, Pública, Rede X"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Período de Avaliação</label>
                <select
                  value={novaEscola.periodoAvaliacao}
                  onChange={(e) => setNovaEscola({ ...novaEscola, periodoAvaliacao: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Selecione...</option>
                  {PERIODOS_AVALIACAO.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Primeira unidade
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome da unidade *</label>
                    <input
                      value={primeiraUnidade.nome}
                      onChange={(e) => setPrimeiraUnidade({ ...primeiraUnidade, nome: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex: Unidade Centro"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                      <input
                        value={primeiraUnidade.cidade}
                        onChange={(e) => setPrimeiraUnidade({ ...primeiraUnidade, cidade: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                      <input
                        value={primeiraUnidade.estado}
                        onChange={(e) => setPrimeiraUnidade({ ...primeiraUnidade, estado: e.target.value })}
                        maxLength={2}
                        placeholder="SP"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Turno</label>
                    <input
                      value={primeiraUnidade.turno}
                      onChange={(e) => setPrimeiraUnidade({ ...primeiraUnidade, turno: e.target.value })}
                      placeholder="Ex: Manhã, Tarde"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={criarEscola}
                disabled={!novaEscola.nome || !primeiraUnidade.nome || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Criar escola"}
              </button>
              <button
                onClick={() => { setModalEscola(false); setNovaEscola({ nome: "", rede: "", periodoAvaliacao: "" }); setPrimeiraUnidade({ nome: "", cidade: "", estado: "", turno: "" }); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Nova Unidade ──────────────────────────────────────────────── */}
      {modalUnidade && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Nova Unidade</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                <input
                  value={novaUnidade.nome}
                  onChange={(e) => setNovaUnidade({ ...novaUnidade, nome: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Unidade Centro"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                  <input
                    value={novaUnidade.cidade}
                    onChange={(e) => setNovaUnidade({ ...novaUnidade, cidade: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                  <input
                    value={novaUnidade.estado}
                    onChange={(e) => setNovaUnidade({ ...novaUnidade, estado: e.target.value })}
                    maxLength={2}
                    placeholder="SP"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Turno</label>
                <input
                  value={novaUnidade.turno}
                  onChange={(e) => setNovaUnidade({ ...novaUnidade, turno: e.target.value })}
                  placeholder="Ex: Manhã, Tarde"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => criarUnidade(modalUnidade)}
                disabled={!novaUnidade.nome || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Criar unidade"}
              </button>
              <button
                onClick={() => setModalUnidade(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Escola ─────────────────────────────────────────────── */}
      {editEscola && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar Escola</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                <input
                  value={editEscola.nome}
                  onChange={(e) => setEditEscola({ ...editEscola, nome: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rede / Grupo</label>
                <input
                  value={editEscola.rede}
                  onChange={(e) => setEditEscola({ ...editEscola, rede: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Período de Avaliação</label>
                <select
                  value={editEscola.periodoAvaliacao}
                  onChange={(e) => setEditEscola({ ...editEscola, periodoAvaliacao: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Selecione...</option>
                  {PERIODOS_AVALIACAO.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={salvarEscola}
                disabled={!editEscola.nome || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => setEditEscola(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Unidade ────────────────────────────────────────────── */}
      {editUnidade && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar Unidade</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                <input
                  value={editUnidade.nome}
                  onChange={(e) => setEditUnidade({ ...editUnidade, nome: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                  <input
                    value={editUnidade.cidade}
                    onChange={(e) => setEditUnidade({ ...editUnidade, cidade: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                  <input
                    value={editUnidade.estado}
                    onChange={(e) => setEditUnidade({ ...editUnidade, estado: e.target.value })}
                    maxLength={2}
                    placeholder="SP"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Turno</label>
                <input
                  value={editUnidade.turno}
                  onChange={(e) => setEditUnidade({ ...editUnidade, turno: e.target.value })}
                  placeholder="Ex: Manhã, Tarde"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={salvarUnidade}
                disabled={!editUnidade.nome || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => setEditUnidade(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600 mb-1">
              Tem certeza que deseja excluir{" "}
              {confirmDelete.tipo === "escola" ? "a escola" : "a unidade"}{" "}
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

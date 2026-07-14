"use client";

import { useState } from "react";
import { Plus, FileText, Download, Pencil, Trash2, Upload, Search } from "lucide-react";
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

const formVazio = {
  titulo: "",
  descricao: "",
  metodo: "",
  serie: "",
  materiaId: "",
  arquivoUrl: "",
  arquivoNome: "",
};

export default function BibliotecaClient({
  materiaisIniciais,
  materias,
}: {
  materiaisIniciais: Material[];
  materias: Materia[];
}) {
  const [materiais, setMateriais] = useState(materiaisIniciais);
  const [busca, setBusca] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroMateriaId, setFiltroMateriaId] = useState("");

  const [modalNovo, setModalNovo] = useState(false);
  const [novo, setNovo] = useState(formVazio);
  const [editando, setEditando] = useState<(typeof formVazio & { id: string }) | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; titulo: string } | null>(null);

  const metodosDisponiveis = Array.from(
    new Set(materiais.map((m) => m.metodo).filter((m): m is string => !!m))
  ).sort();

  const materiaisFiltrados = materiais.filter((m) => {
    if (filtroMetodo && m.metodo !== filtroMetodo) return false;
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

  async function enviarArquivo(file: File, aplicar: (url: string, nome: string) => void) {
    setEnviandoArquivo(true);
    setErro("");
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao enviar arquivo.");
        return;
      }
      aplicar(data.url, data.nome);
    } finally {
      setEnviandoArquivo(false);
    }
  }

  async function criarMaterial() {
    if (!novo.titulo || !novo.arquivoUrl) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/biblioteca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novo),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao criar material.");
        return;
      }
      setMateriais((prev) => [data, ...prev]);
      setModalNovo(false);
      setNovo(formVazio);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/biblioteca/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editando),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao salvar.");
        return;
      }
      setMateriais((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      setEditando(null);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMaterial() {
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
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou descrição..."
              className="border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <select
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os métodos</option>
            {metodosDisponiveis.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filtroSerie}
            onChange={(e) => setFiltroSerie(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as séries</option>
            {SERIES.flatMap((g) => g.opcoes).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filtroMateriaId}
            onChange={(e) => setFiltroMateriaId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as disciplinas</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          <button
            onClick={() => { setErro(""); setModalNovo(true); }}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Novo material
          </button>
        </div>
      </div>

      {/* Lista */}
      {materiaisFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          Nenhum material cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materiaisFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{m.titulo}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[m.metodo, m.serie, m.materia?.nome].filter(Boolean).join(" · ") || "Sem categorização"}
                  </p>
                </div>
              </div>
              {m.descricao && <p className="text-xs text-slate-500 line-clamp-2">{m.descricao}</p>}
              <div className="flex items-center gap-1 mt-auto pt-2">
                <a
                  href={m.arquivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg py-1.5 transition-colors"
                >
                  <Download size={13} /> Baixar
                </a>
                <button
                  onClick={() => {
                    setErro("");
                    setEditando({
                      id: m.id,
                      titulo: m.titulo,
                      descricao: m.descricao ?? "",
                      metodo: m.metodo ?? "",
                      serie: m.serie ?? "",
                      materiaId: m.materiaId ?? "",
                      arquivoUrl: m.arquivoUrl,
                      arquivoNome: m.arquivoNome ?? "",
                    });
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: m.id, titulo: m.titulo })}
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

      {/* Modal Novo Material */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Novo Material</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input
                  value={novo.titulo}
                  onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Apostila de frações"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea
                  value={novo.descricao}
                  onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Método</label>
                  <input
                    value={novo.metodo}
                    onChange={(e) => setNovo({ ...novo, metodo: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Singapura"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Série</label>
                  <select
                    value={novo.serie}
                    onChange={(e) => setNovo({ ...novo, serie: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina</label>
                <select
                  value={novo.materiaId}
                  onChange={(e) => setNovo({ ...novo, materiaId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Nenhuma</option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arquivo *</label>
                <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload size={15} />
                  {enviandoArquivo ? "Enviando..." : novo.arquivoNome || "Escolher arquivo (PDF, imagem ou Word)"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                    disabled={enviandoArquivo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) enviarArquivo(file, (url, nome) => setNovo((p) => ({ ...p, arquivoUrl: url, arquivoNome: nome })));
                    }}
                  />
                </label>
              </div>
            </div>
            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erro}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={criarMaterial}
                disabled={!novo.titulo || !novo.arquivoUrl || salvando || enviandoArquivo}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Criar material"}
              </button>
              <button
                onClick={() => { setModalNovo(false); setNovo(formVazio); setErro(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Material */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar Material</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input
                  value={editando.titulo}
                  onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea
                  value={editando.descricao}
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Método</label>
                  <input
                    value={editando.metodo}
                    onChange={(e) => setEditando({ ...editando, metodo: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Série</label>
                  <select
                    value={editando.serie}
                    onChange={(e) => setEditando({ ...editando, serie: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina</label>
                <select
                  value={editando.materiaId}
                  onChange={(e) => setEditando({ ...editando, materiaId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Nenhuma</option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arquivo</label>
                <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload size={15} />
                  {enviandoArquivo ? "Enviando..." : editando.arquivoNome || "Substituir arquivo"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                    disabled={enviandoArquivo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) enviarArquivo(file, (url, nome) => setEditando((p) => p && ({ ...p, arquivoUrl: url, arquivoNome: nome })));
                    }}
                  />
                </label>
              </div>
            </div>
            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erro}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={salvarEdicao}
                disabled={!editando.titulo || salvando || enviandoArquivo}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => { setEditando(null); setErro(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir <strong>{confirmDelete.titulo}</strong>?
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={excluirMaterial}
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

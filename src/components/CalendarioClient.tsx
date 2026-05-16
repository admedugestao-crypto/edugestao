"use client";

import { useState } from "react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SERIES } from "@/lib/series";
import { CalendarClock, Clock, Pencil, Trash2 } from "lucide-react";

type Materia = { id: string; nome: string; cor: string };

type Avaliacao = {
  id: string;
  unidadeId: string;
  nome: string;
  serie: string;
  data: string;
  notaMax: number;
  periodo: string | null;
  materiaId: string | null;
  materia: Materia | null;
  unidade: { nome: string; escola: { nome: string } };
};

type Escola = {
  id: string;
  nome: string;
  periodoAvaliacao: string | null;
  unidades: { id: string; nome: string }[];
};

type FormAv = {
  unidadeId: string;
  materiaId: string;
  serie: string;
  nome: string;
  data: string;
  notaMax: string;
  periodo: string;
};

const TIPOS = ["Prova 1", "Prova 2", "Prova de Recuperação", "Simulado"] as const;

const PERIODOS_POR_TIPO: Record<string, string[]> = {
  Bimestral:  ["1º Bimestre",  "2º Bimestre",  "3º Bimestre",  "4º Bimestre"],
  Trimestral: ["1º Trimestre", "2º Trimestre", "3º Trimestre"],
  Semestral:  ["1º Semestre",  "2º Semestre"],
};

function getPeriodos(periodoAvaliacao: string | null | undefined): string[] {
  return PERIODOS_POR_TIPO[periodoAvaliacao ?? ""] ?? PERIODOS_POR_TIPO["Trimestral"];
}

const formVazio: FormAv = { unidadeId: "", materiaId: "", serie: "", nome: "", data: "", notaMax: "5", periodo: "" };

type Unidade = { id: string; nome: string; escola: string; periodoAvaliacao: string | null };

function CamposForm({
  form,
  setForm,
  unidades,
  materias,
}: {
  form: FormAv;
  setForm: (f: FormAv) => void;
  unidades: Unidade[];
  materias: Materia[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Unidade *</label>
        <select
          value={form.unidadeId}
          onChange={(e) => setForm({ ...form, unidadeId: e.target.value, periodo: "" })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Selecione...</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>{u.escola} · {u.nome}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Série *</label>
          <select value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="" disabled>Selecione</option>
            {SERIES.map((g) => (
              <optgroup key={g.grupo} label={g.grupo}>
                {g.opcoes.map((s) => <option key={s} value={s}>{s}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina *</label>
          <select
            value={form.materiaId}
            onChange={(e) => setForm({ ...form, materiaId: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Selecione...</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
          <select value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="" disabled>Selecione...</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Período *</label>
          {(() => {
            const unidadeSel = unidades.find((u) => u.id === form.unidadeId);
            const opcoes = getPeriodos(unidadeSel?.periodoAvaliacao);
            return (
              <select
                value={form.periodo}
                onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                disabled={!form.unidadeId}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50"
              >
                <option value="">{form.unidadeId ? "Selecione..." : "Selecione a unidade primeiro"}</option>
                {opcoes.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            );
          })()}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Data *</label>
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nota máx. *</label>
          <input type="number" value={form.notaMax} onChange={(e) => setForm({ ...form, notaMax: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
    </div>
  );
}

export default function CalendarioClient({
  avaliacoes,
  escolas,
  materias,
}: {
  avaliacoes: Avaliacao[];
  escolas: Escola[];
  materias: Materia[];
}) {
  const [filtroEscola, setFiltroEscola] = useState("");
  const [filtroSerie, setFiltroSerie] = useState("");
  const [modal, setModal] = useState(false);
  const [nova, setNova] = useState<FormAv>(formVazio);
  const [lista, setLista] = useState(avaliacoes);

  const [editAv, setEditAv] = useState<(FormAv & { id: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string; materia: string } | null>(null);
  const [erroDelete, setErroDelete] = useState("");
  const [salvando, setSalvando] = useState(false);

  const hoje = new Date();

  const filtradas = lista.filter((a) => {
    if (filtroSerie && a.serie !== filtroSerie) return false;
    if (filtroEscola && a.unidade.escola.nome !== filtroEscola) return false;
    return true;
  });

  const proximas = filtradas.filter((a) => isAfter(parseDataLocal(a.data), hoje));
  const passadas = filtradas.filter((a) => !isAfter(parseDataLocal(a.data), hoje));

  const escolasNomes = escolas.map((e) => e.nome);
  const unidades = escolas.flatMap((e) =>
    e.unidades.map((u) => ({ ...u, escola: e.nome, periodoAvaliacao: e.periodoAvaliacao }))
  );

  async function criarAvaliacao() {
    setSalvando(true);
    try {
      const res = await fetch("/api/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nova, notaMax: parseFloat(nova.notaMax) }),
      });
      const av = await res.json();
      setLista((prev) => [...prev, av]);
      setModal(false);
      setNova(formVazio);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAvaliacao() {
    if (!editAv) return;
    setSalvando(true);
    try {
      const res = await fetch(`/api/avaliacoes/${editAv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editAv, notaMax: parseFloat(editAv.notaMax) }),
      });
      const atualizada = await res.json();
      setLista((prev) => prev.map((a) => (a.id === atualizada.id ? atualizada : a)));
      setEditAv(null);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirAvaliacao() {
    if (!confirmDelete) return;
    setErroDelete("");
    setSalvando(true);
    const res = await fetch(`/api/avaliacoes/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroDelete(data.erro ?? "Erro ao excluir.");
      setSalvando(false);
      return;
    }
    setLista((prev) => prev.filter((a) => a.id !== confirmDelete.id));
    setConfirmDelete(null);
    setSalvando(false);
  }

  function abrirEdit(av: Avaliacao) {
    setEditAv({
      id: av.id,
      unidadeId: av.unidadeId,
      materiaId: av.materiaId ?? "",
      serie: av.serie,
      nome: av.nome,
      data: av.data.split("T")[0],
      notaMax: String(av.notaMax),
      periodo: av.periodo ?? "",
    });
  }

  // Parse date without timezone shift
  function parseDataLocal(iso: string) {
    const [y, m, d] = iso.split("T")[0].split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function AvaliacaoRow({ av, futura }: { av: Avaliacao; futura: boolean }) {
    return (
      <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 group">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {av.materia && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
              style={{ backgroundColor: av.materia.cor }}
            >
              {av.materia.nome}
            </span>
          )}
          <p className="font-medium text-slate-800 text-sm">{av.nome}</p>
          {av.periodo && (
            <span className="text-xs text-slate-400">· {av.periodo}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate hidden sm:block">
          {av.unidade.escola.nome} · {av.unidade.nome} · {av.serie}
        </p>
        <span className="text-xs text-slate-400 shrink-0">Máx: {av.notaMax}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => abrirEdit(av)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => { setErroDelete(""); setConfirmDelete({ id: av.id, nome: av.nome, materia: av.materia?.nome ?? "" }); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Agrupa avaliações por data (dd/MM/yyyy), preservando a ordem
  function agruparPorData(avs: Avaliacao[]) {
    const mapa = new Map<string, Avaliacao[]>();
    for (const av of avs) {
      const key = av.data.split("T")[0]; // "2026-06-05"
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(av);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

  function GrupoData({ dateKey, avs, futura }: { dateKey: string; avs: Avaliacao[]; futura: boolean }) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const dataLocal = new Date(y, m - 1, d);
    const label = format(dataLocal, "dd/MM/yyyy", { locale: ptBR });
    const diaSemana = format(dataLocal, "EEE", { locale: ptBR });
    return (
      <div className="border border-slate-100 rounded-lg overflow-hidden">
        <div className={`flex items-center gap-3 px-3 py-2 ${futura ? "bg-indigo-50" : "bg-slate-50"}`}>
          <span className={`text-sm font-bold ${futura ? "text-indigo-700" : "text-slate-500"}`}>{label}</span>
          <span className={`text-xs capitalize ${futura ? "text-indigo-500" : "text-slate-400"}`}>{diaSemana}</span>
          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${futura ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
            {avs.length} prova{avs.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="divide-y divide-slate-50 px-1">
          {avs.map((av) => <AvaliacaoRow key={av.id} av={av} futura={futura} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filtroEscola}
            onChange={(e) => setFiltroEscola(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as escolas</option>
            {escolasNomes.map((n) => (
              <option key={n} value={n}>{n}</option>
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
          <button
            onClick={() => setModal(true)}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Adicionar prova
          </button>
        </div>
      </div>

      {proximas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800 text-sm">Próximas provas</h2>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {proximas.length}
            </span>
          </div>
          <div className="space-y-2">
            {agruparPorData(proximas).map(([dateKey, avs]) => (
              <GrupoData key={dateKey} dateKey={dateKey} avs={avs} futura={true} />
            ))}
          </div>
        </div>
      )}

      {passadas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-slate-400" />
            <h2 className="font-semibold text-slate-600 text-sm">Provas passadas</h2>
          </div>
          <div className="space-y-2">
            {agruparPorData(passadas).map(([dateKey, avs]) => (
              <GrupoData key={dateKey} dateKey={dateKey} avs={avs} futura={false} />
            ))}
          </div>
        </div>
      )}

      {filtradas.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          Nenhuma avaliação cadastrada.
        </div>
      )}

      {/* ── Modal Nova Avaliação ──────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Nova Avaliação</h2>
            <CamposForm form={nova} setForm={setNova} unidades={unidades} materias={materias} />
            <div className="flex gap-3 mt-5">
              <button
                onClick={criarAvaliacao}
                disabled={!nova.unidadeId || !nova.serie || !nova.materiaId || !nova.nome || !nova.periodo || !nova.data || !nova.notaMax || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Criar avaliação"}
              </button>
              <button onClick={() => { setModal(false); setNova(formVazio); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Avaliação ────────────────────────────────────────── */}
      {editAv && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar Avaliação</h2>
            <CamposForm form={editAv} setForm={(f) => setEditAv({ ...f, id: editAv.id })} unidades={unidades} materias={materias} />
            <div className="flex gap-3 mt-5">
              <button
                onClick={salvarAvaliacao}
                disabled={!editAv.unidadeId || !editAv.serie || !editAv.materiaId || !editAv.nome || !editAv.periodo || !editAv.data || !editAv.notaMax || salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setEditAv(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">Cancelar</button>
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
              Tem certeza que deseja excluir a avaliação{" "}
              <strong>{confirmDelete.materia} — {confirmDelete.nome}</strong>?
            </p>
            {erroDelete && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroDelete}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={excluirAvaliacao}
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

"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

type Horario = { dia: string; inicio: string; fim: string };
type Professora = { id: string; nome: string; disponibilidade: Horario[] };
const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function DisponibilidadeProfessoresClient({ professorasIniciais }: { professorasIniciais: Professora[] }) {
  const [professoras, setProfessoras] = useState(professorasIniciais);
  const [professoraId, setProfessoraId] = useState(professorasIniciais[0]?.id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const professora = professoras.find((p) => p.id === professoraId);

  function alterar(horarios: Horario[]) {
    setProfessoras((lista) => lista.map((p) => p.id === professoraId ? { ...p, disponibilidade: horarios } : p));
    setMensagem("");
  }

  async function salvar() {
    if (!professora) return;
    setSalvando(true);
    setMensagem("");
    try {
      const res = await fetch(`/api/professoras/${professora.id}/disponibilidade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponibilidade: professora.disponibilidade }),
      });
      const data = await res.json();
      setMensagem(res.ok ? "Disponibilidade salva com sucesso." : data.erro ?? "Não foi possível salvar.");
    } catch {
      setMensagem("Falha de conexão. Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (professoras.length === 0) return <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-500">Nenhum professor ativo cadastrado.</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      <div className="max-w-md">
        <label className="block text-sm font-medium text-slate-700 mb-1">Professor</label>
        <select aria-label="Professor" disabled={salvando} value={professoraId} onChange={(e) => { setProfessoraId(e.target.value); setMensagem(""); }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
          {professoras.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      <div data-availability-actions className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800">Horários disponíveis</h2>
          <p className="text-xs text-slate-500">Cadastre uma ou mais faixas para cada dia.</p>
        </div>
        <button type="button" disabled={salvando} onClick={() => alterar([...(professora?.disponibilidade ?? []), { dia: "Segunda", inicio: "08:00", fim: "12:00" }])} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100">
          <Plus size={16} /> Adicionar horário
        </button>
      </div>

      {professora?.disponibilidade.length === 0 ? (
        <p className="text-sm text-slate-400 italic py-4">Nenhum horário cadastrado para este professor.</p>
      ) : (
        <div className="space-y-2">
          {professora?.disponibilidade.map((h, i) => (
            <div data-availability-row key={`${h.dia}-${i}`} className="grid grid-cols-[minmax(120px,1fr)_120px_auto_120px_36px] items-center gap-2 bg-slate-50 rounded-lg p-2">
              <select aria-label={`Dia da faixa ${i + 1}`} disabled={salvando} value={h.dia} onChange={(e) => alterar(professora.disponibilidade.map((item, j) => j === i ? { ...item, dia: e.target.value } : item))} className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white">
                {DIAS.map((dia) => <option key={dia}>{dia}</option>)}
              </select>
              <input aria-label={`Início da faixa ${i + 1}`} disabled={salvando} type="time" value={h.inicio} onChange={(e) => alterar(professora.disponibilidade.map((item, j) => j === i ? { ...item, inicio: e.target.value } : item))} className="border border-slate-200 rounded-lg px-2 py-2 text-sm" />
              <span className="text-sm text-slate-400">até</span>
              <input aria-label={`Fim da faixa ${i + 1}`} disabled={salvando} type="time" value={h.fim} onChange={(e) => alterar(professora.disponibilidade.map((item, j) => j === i ? { ...item, fim: e.target.value } : item))} className="border border-slate-200 rounded-lg px-2 py-2 text-sm" />
              <button type="button" aria-label="Remover horário" disabled={salvando} onClick={() => alterar(professora.disponibilidade.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600 flex justify-center"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {mensagem && <p role={mensagem.includes("sucesso") ? "status" : "alert"} className={`text-sm rounded-lg px-3 py-2 ${mensagem.includes("sucesso") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{mensagem}</p>}
      <button type="button" onClick={salvar} disabled={salvando || !professora} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-lg text-sm">
        <Save size={16} /> {salvando ? "Salvando..." : "Salvar disponibilidade"}
      </button>
    </div>
  );
}

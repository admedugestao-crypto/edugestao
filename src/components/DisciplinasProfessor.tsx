"use client";
import { useState } from "react";

type Materia = { id: string; nome: string };
export default function DisciplinasProfessor({ professoraId, materias, iniciais }: { professoraId: string; materias: Materia[]; iniciais: string[] }) {
  const [ids, setIds] = useState(iniciais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  async function alterar(id: string) {
    setSalvando(true); setErro("");
    const remover = ids.includes(id);
    try {
      const res = await fetch(`/api/professoras/${professoraId}/materias`, { method: remover ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ materiaId: id }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.erro || "Não foi possível salvar o vínculo."); }
      setIds(atual => remover ? atual.filter(item => item !== id) : [...atual, id]);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha de conexão. Tente novamente."); }
    finally { setSalvando(false); }
  }
  return <section className="border-b border-slate-200 pb-5">
    <h2 className="font-semibold text-slate-800">Disciplinas que o professor leciona</h2>
    <p className="text-xs text-slate-500 mt-1 mb-3">Selecione as disciplinas deste professor. Cada alteração é salva automaticamente.</p>
    <div className="flex flex-wrap gap-3">{materias.map(m => <label key={m.id} className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm"><input type="checkbox" checked={ids.includes(m.id)} disabled={salvando} onChange={() => alterar(m.id)}/>{m.nome}</label>)}</div>
    {!materias.length && <p className="text-sm text-slate-500">Cadastre as matérias no menu Disciplinas.</p>}
    {salvando && <p role="status" className="text-sm mt-2">Salvando disciplinas…</p>}
    {erro && <p role="alert" className="text-sm text-red-600 mt-2">{erro}</p>}
  </section>;
}

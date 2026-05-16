"use client";

import { useState } from "react";
import { Save, Trash2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

function parseDataLocal(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

type Materia = { id: string; nome: string; cor: string };
type Aluno = {
  id: string;
  nome: string;
  serie: string;
  unidadeId: string;
  unidade: {
    nome: string;
    escola: { nome: string; periodoAvaliacao: string | null };
  };
  materias: { materia: Materia }[];
};
type Avaliacao = {
  id: string;
  nome: string;
  serie: string;
  data: string;
  notaMax: number;
  periodo: string | null;
  materiaId: string | null;
  materia: Materia | null;
  unidadeId: string;
  unidade: { nome: string; escola: { nome: string } };
};
type Nota = {
  id: string;
  alunoId: string;
  avaliacaoId: string;
  materiaId: string;
  valor: number;
};

export default function NotasClient({
  alunos,
  avaliacoes,
  notasIniciais,
}: {
  alunos: Aluno[];
  avaliacoes: Avaliacao[];
  notasIniciais: Nota[];
}) {
  const [alunoSel, setAlunoSel] = useState<string>("");
  const [notas, setNotas] = useState<Record<string, number>>(
    Object.fromEntries(notasIniciais.map((n) => [`${n.alunoId}-${n.avaliacaoId}-${n.materiaId}`, n.valor]))
  );
  const [salvando, setSalvando] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [erroDelete, setErroDelete] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  const aluno = alunos.find((a) => a.id === alunoSel);
  const avsDoAluno = aluno
    ? avaliacoes.filter((av) => av.unidadeId === aluno.unidadeId && av.serie === aluno.serie)
    : [];

  function notaKey(avaliacaoId: string, materiaId: string) {
    return `${alunoSel}-${avaliacaoId}-${materiaId}`;
  }

  async function salvarNota(avaliacaoId: string, materiaId: string) {
    const key = notaKey(avaliacaoId, materiaId);
    const valor = notas[key];
    if (valor === undefined) return;
    setSalvando(key);
    await fetch("/api/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alunoId: alunoSel, avaliacaoId, materiaId, valor }),
    });
    setSalvando(null);
  }

  async function excluirAvaliacao() {
    if (!confirmDelete) return;
    setErroDelete("");
    setExcluindo(true);
    const res = await fetch(`/api/avaliacoes/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroDelete(data.erro ?? "Erro ao excluir.");
      setExcluindo(false);
      return;
    }
    setConfirmDelete(null);
    setExcluindo(false);
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      {/* Seleção de aluno */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Selecionar aluno
        </label>
        <select
          value={alunoSel}
          onChange={(e) => setAlunoSel(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Escolha um aluno...</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome} — {a.unidade.escola.nome} · {a.serie}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela de notas */}
      {aluno && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-semibold text-slate-800">{aluno.nome}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {aluno.unidade.escola.nome} · {aluno.unidade.nome} · {aluno.serie}
            </p>
          </div>

          {avsDoAluno.length === 0 ? (
            <div className="p-8 flex flex-col items-center gap-3 text-center">
              <CalendarDays size={32} className="text-slate-300" />
              <p className="text-slate-500 text-sm">
                Nenhuma avaliação prevista no calendário para esta unidade / série.
              </p>
              <Link
                href="/dashboard/calendario"
                className="text-indigo-600 hover:underline text-sm font-medium"
              >
                Ir para o Calendário de Provas →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-2 px-4 text-xs font-medium text-slate-500">Avaliação</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-slate-500">Período</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-slate-500">Data</th>
                    {aluno.materias.map(({ materia }) => (
                      <th
                        key={materia.id}
                        className="text-center py-2 px-4 text-xs font-medium"
                        style={{ color: materia.cor }}
                      >
                        {materia.nome}
                      </th>
                    ))}
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {avsDoAluno.map((av) => (
                    <tr key={av.id} className="hover:bg-slate-50 group">
                      <td className="py-3 px-4 font-medium text-slate-700">{av.nome}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{av.periodo ?? "—"}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {format(parseDataLocal(av.data), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      {aluno.materias.map(({ materia }) => {
                        const key = notaKey(av.id, materia.id);
                        const val = notas[key];
                        return (
                          <td key={materia.id} className="py-2 px-3 text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                min={0}
                                max={av.notaMax}
                                step={0.1}
                                value={val ?? ""}
                                onChange={(e) =>
                                  setNotas({ ...notas, [key]: parseFloat(e.target.value) })
                                }
                                className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                onClick={() => salvarNota(av.id, materia.id)}
                                disabled={salvando === key}
                                className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Salvar nota"
                              >
                                <Save size={13} />
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2">
                        <button
                          onClick={() => { setErroDelete(""); setConfirmDelete({ id: av.id, nome: av.nome }); }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                          title="Excluir avaliação"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ─────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir a avaliação{" "}
              <strong>{confirmDelete.nome}</strong>?
            </p>
            {erroDelete && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroDelete}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={excluirAvaliacao}
                disabled={excluindo}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {excluindo ? "Excluindo..." : "Excluir"}
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

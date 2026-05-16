"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Eye, Trash2, DollarSign, CheckCircle2, Clock, AlertCircle, Ban } from "lucide-react";

const TIPO_LABEL: Record<string, string> = {
  MENSAL: "Mensal", QUINZENAL: "Quinzenal", SEMANAL: "Semanal", POR_AULA: "Por aula",
};

type Pagamento = {
  parcela: number; pago: boolean; dataVencimento?: string;
  diaPagamento?: number | null;
};

type Aluno = {
  id: string;
  nome: string;
  fotoUrl: string | null;
  serie: string;
  turma: string | null;
  status: string;
  unidade: { nome: string; escola: { nome: string } };
  materias: { materia: { nome: string; cor: string } }[];
  professora?: { usuario: { nome: string } } | null;
  // pagamento
  tipoCobranca?: string | null;
  valorCobranca?: number | null;
  diaPagamento?: number | null;
  diaPagamento2?: number | null;
  diaSemana?: number | null;
  pagamentos?: { parcela: number; pago: boolean; mes: number; ano: number }[];
};

function StatusPagamento({
  aluno, mes, ano,
}: {
  aluno: Aluno; mes: number; ano: number;
}) {
  if (!aluno.tipoCobranca || !aluno.valorCobranca) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Ban size={11} /> Sem cobrança
      </span>
    );
  }

  // Determina se alguma parcela deste mês está em aberto/atrasada/paga
  const pgs = aluno.pagamentos?.filter((p) => p.mes === mes && p.ano === ano) ?? [];
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  // Calcula parcelas esperadas para o mês
  let totalParcelas = 1;
  if (aluno.tipoCobranca === "QUINZENAL") totalParcelas = 2;
  if (aluno.tipoCobranca === "SEMANAL") {
    // conta ocorrências do dia da semana no mês
    const diasNoMes = new Date(ano, mes, 0).getDate();
    let count = 0;
    for (let d = 1; d <= diasNoMes; d++) {
      if (new Date(ano, mes - 1, d).getDay() === (aluno.diaSemana ?? 0)) count++;
    }
    totalParcelas = count;
  }

  const pagas = pgs.filter((p) => p.pago).length;

  // Vencimento da 1ª parcela para checar atraso
  let venc: Date | null = null;
  if (aluno.tipoCobranca === "MENSAL" && aluno.diaPagamento) {
    venc = new Date(ano, mes - 1, aluno.diaPagamento);
  } else if (aluno.tipoCobranca === "QUINZENAL" && aluno.diaPagamento) {
    venc = new Date(ano, mes - 1, aluno.diaPagamento);
  } else if (aluno.tipoCobranca === "SEMANAL" && aluno.diaSemana !== null && aluno.diaSemana !== undefined) {
    const diasNoMes = new Date(ano, mes, 0).getDate();
    for (let d = 1; d <= diasNoMes; d++) {
      const dt = new Date(ano, mes - 1, d);
      if (dt.getDay() === aluno.diaSemana) { venc = dt; break; }
    }
  } else if (aluno.tipoCobranca === "POR_AULA") {
    venc = new Date(ano, mes - 1, new Date(ano, mes, 0).getDate());
  }

  const atrasado = venc && hoje > venc && pagas < totalParcelas;

  if (pagas === totalParcelas) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle2 size={11} /> Em dia
      </span>
    );
  }
  if (atrasado) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertCircle size={11} /> Atrasado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock size={11} /> Pendente
    </span>
  );
}

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AlunosTabela({
  alunos: alunosIniciais,
  isAdmin = false,
  mes,
  ano,
}: {
  alunos: Aluno[];
  isAdmin?: boolean;
  mes?: number;
  ano?: number;
}) {
  const [alunos, setAlunos] = useState(alunosIniciais);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [erroDelete, setErroDelete] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  const mesRef = mes ?? new Date().getMonth() + 1;
  const anoRef = ano ?? new Date().getFullYear();

  async function excluirAluno() {
    if (!confirmDelete) return;
    setErroDelete("");
    setExcluindo(true);
    const res = await fetch(`/api/alunos/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroDelete(data.erro ?? "Erro ao excluir.");
      setExcluindo(false);
      return;
    }
    setAlunos((prev) => prev.filter((a) => a.id !== confirmDelete.id));
    setConfirmDelete(null);
    setExcluindo(false);
  }

  if (alunos.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        Nenhum aluno encontrado.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Aluno</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Escola / Série</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Disciplinas</th>
              {isAdmin && (
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Cadastrado por</th>
              )}
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Cobrança</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="py-2 px-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {alunos.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors group">

                {/* Nome */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    {a.fotoUrl ? (
                      <Image src={a.fotoUrl} alt={a.nome} width={32} height={32} className="rounded-full object-cover w-8 h-8" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-xs">
                        {a.nome.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-slate-800">{a.nome}</span>
                  </div>
                </td>

                {/* Escola */}
                <td className="py-3 px-3 text-slate-600">
                  <div>{a.unidade.escola.nome}</div>
                  <div className="text-xs text-slate-400">{a.unidade.nome} · {a.serie}{a.turma ? ` - ${a.turma}` : ""}</div>
                </td>

                {/* Disciplinas */}
                <td className="py-3 px-3">
                  <div className="flex gap-1 flex-wrap">
                    {a.materias.map(({ materia }) => (
                      <span key={materia.nome} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: materia.cor }}>
                        {materia.nome}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Cadastrado por (admin) */}
                {isAdmin && (
                  <td className="py-3 px-3 text-sm text-slate-600">
                    {a.professora?.usuario?.nome ?? "—"}
                  </td>
                )}

                {/* Cobrança */}
                <td className="py-3 px-3">
                  {a.tipoCobranca && a.valorCobranca ? (
                    <div>
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full mb-0.5">
                        {TIPO_LABEL[a.tipoCobranca] ?? a.tipoCobranca}
                      </span>
                      <p className="text-xs text-slate-500">{moeda(a.valorCobranca)}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>

                {/* Status aluno */}
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.status === "ATIVO" ? "bg-emerald-100 text-emerald-700"
                    : a.status === "PAUSADO" ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                  }`}>
                    {a.status === "ATIVO" ? "Ativo" : a.status === "PAUSADO" ? "Pausado" : "Encerrado"}
                  </span>
                  <div className="mt-1">
                    <StatusPagamento aluno={a} mes={mesRef} ano={anoRef} />
                  </div>
                </td>

                {/* Ações */}
                <td className="py-3 px-3">
                  <div className="flex gap-1 justify-end">
                    <Link href={`/dashboard/alunos/${a.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Ver aluno">
                      <Eye size={15} />
                    </Link>
                    <Link href={`/dashboard/alunos/${a.id}/editar`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Editar aluno">
                      <Pencil size={15} />
                    </Link>
                    <Link href={`/dashboard/pagamentos?aluno=${a.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Pagamentos do aluno">
                      <DollarSign size={15} />
                    </Link>
                    <button
                      onClick={() => { setErroDelete(""); setConfirmDelete({ id: a.id, nome: a.nome }); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir aluno">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir o aluno <strong>{confirmDelete.nome}</strong>?
            </p>
            {erroDelete && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroDelete}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={excluirAluno} disabled={excluindo}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
              <button onClick={() => { setConfirmDelete(null); setErroDelete(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Mail, CheckCircle2, XCircle, AlertTriangle, Search, RefreshCw } from "lucide-react";

type RegistroEmail = {
  id: string;
  diasAntes: number;
  emailEnviado: boolean;
  email: string;
  criadoEm: string;
  professor: string;
  avaliacao: {
    nome: string;
    serie: string;
    data: string;
    materia: string | null;
    escola: string;
    unidade: string;
  };
};

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtData(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function fmtDataHora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function BadgeStatus({ enviado }: { enviado: boolean }) {
  return enviado
    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"><CheckCircle2 size={12}/>Enviado</span>
    : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium"><XCircle size={12}/>Falhou</span>;
}

function BadgeDias({ dias }: { dias: number }) {
  const label = dias === 0 ? "No dia" : dias === 1 ? "1 dia antes" : `${dias} dias antes`;
  const cls   = dias === 0 ? "bg-red-100 text-red-700" : dias === 1 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

export default function HistoricoEmailsClient({
  historico,
  emailAtivo,
}: {
  historico: RegistroEmail[];
  emailAtivo: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "enviado" | "falhou">("todos");
  const [disparando, setDisparando] = useState(false);
  const [msgDisparo, setMsgDisparo] = useState<{ ok: boolean; txt: string } | null>(null);

  const registros = useMemo(() => {
    return historico.filter((r) => {
      const textoOk = !busca || [r.professor, r.email, r.avaliacao.nome, r.avaliacao.escola, r.avaliacao.serie]
        .some((s) => s.toLowerCase().includes(busca.toLowerCase()));
      const statusOk =
        filtroStatus === "todos" ||
        (filtroStatus === "enviado" && r.emailEnviado) ||
        (filtroStatus === "falhou" && !r.emailEnviado);
      return textoOk && statusOk;
    });
  }, [historico, busca, filtroStatus]);

  const totalEnviados = historico.filter((r) => r.emailEnviado).length;
  const totalFalhos   = historico.filter((r) => !r.emailEnviado).length;

  async function dispararAgora() {
    setDisparando(true);
    setMsgDisparo(null);
    try {
      const res  = await fetch("/api/cron/notificacoes");
      const data = await res.json();
      const enviados = data?.email?.enviadas ?? 0;
      const erros    = data?.email?.erros?.length ?? 0;
      setMsgDisparo({
        ok: res.ok,
        txt: res.ok
          ? `Processo concluído — ${enviados} e-mail(s) enviado(s)${erros > 0 ? `, ${erros} erro(s)` : ""}.`
          : "Erro ao executar o processo.",
      });
    } catch {
      setMsgDisparo({ ok: false, txt: "Falha na comunicação com o servidor." });
    } finally {
      setDisparando(false);
      setTimeout(() => setMsgDisparo(null), 6000);
    }
  }

  return (
    <div className="space-y-5">

      {/* Aviso SMTP inativo */}
      {!emailAtivo && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            E-mail SMTP não configurado. Configure <code className="bg-amber-100 px-1 rounded text-xs">EMAIL_HOST</code>,{" "}
            <code className="bg-amber-100 px-1 rounded text-xs">EMAIL_USER</code> e{" "}
            <code className="bg-amber-100 px-1 rounded text-xs">EMAIL_PASS</code> no <code className="bg-amber-100 px-1 rounded text-xs">.env.local</code>.
          </p>
        </div>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Total registrado</p>
          <p className="text-2xl font-bold text-slate-800">{historico.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-xs font-medium text-emerald-600 mb-1">Enviados</p>
          <p className="text-2xl font-bold text-emerald-700">{totalEnviados}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs font-medium text-red-600 mb-1">Falhas</p>
          <p className="text-2xl font-bold text-red-700">{totalFalhos}</p>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar professor, e-mail, avaliação, escola..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filtro status */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["todos","enviado","falhou"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFiltroStatus(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filtroStatus === v ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v === "todos" ? "Todos" : v === "enviado" ? "Enviados" : "Falhas"}
            </button>
          ))}
        </div>

        {/* Disparar agora */}
        <button
          onClick={dispararAgora}
          disabled={disparando || !emailAtivo}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {disparando
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <RefreshCw size={14} />
          }
          Disparar agora
        </button>
      </div>

      {/* Feedback disparo */}
      {msgDisparo && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msgDisparo.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {msgDisparo.txt}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {registros.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            {historico.length === 0
              ? "Nenhum e-mail registrado ainda. O processo roda automaticamente às 08:00."
              : "Nenhum registro encontrado para os filtros aplicados."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Enviado em</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Professor(a)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">E-mail</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Avaliação</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Data da prova</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Antecedência</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDataHora(r.criadoEm)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-xs">{r.professor}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.email}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 text-xs">{r.avaliacao.nome}</p>
                      <p className="text-xs text-slate-400">
                        {r.avaliacao.materia ? `${r.avaliacao.materia} · ` : ""}
                        {r.avaliacao.serie} · {r.avaliacao.escola}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {fmtData(r.avaliacao.data)}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeDias dias={r.diasAntes} />
                    </td>
                    <td className="px-4 py-3">
                      <BadgeStatus enviado={r.emailEnviado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {registros.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">{registros.length} registro(s) exibido(s)</p>
          </div>
        )}
      </div>
    </div>
  );
}

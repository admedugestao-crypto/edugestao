"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, MessageCircle, CheckCircle2, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { montarMensagem, formatarWhatsapp } from "@/lib/notificacoes";

function parseDataLocal(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

type Avaliacao = {
  id: string;
  nome: string;
  serie: string;
  data: string;
  periodo: string | null;
  materia: { nome: string } | null;
  unidade: { nome: string; escola: { nome: string } };
  notificacoes: { professoraId: string; diasAntes: number; enviada: boolean }[];
};

type Historico = {
  id: string;
  whatsapp: string;
  diasAntes: number;
  enviada: boolean;
  criadoEm: string;
  professora: { usuario: { nome: string } };
  avaliacao: {
    nome: string;
    data: string;
    materia: { nome: string } | null;
    unidade: { nome: string; escola: { nome: string } };
  };
};

export default function NotificacoesClient({
  avaliacoes,
  historico,
  evolutionConfigurada,
  provedor,
}: {
  avaliacoes: Avaliacao[];
  historico: Historico[];
  evolutionConfigurada: boolean;
  provedor?: "fonnte" | "zapi" | "evolution" | null;
}) {
  const [disparando, setDisparando] = useState(false);
  const [resultado, setResultado] = useState<{
    enviadas: number;
    pendentes: { numero: string; mensagem: string; professorNome: string; avaliacaoNome: string }[];
  } | null>(null);

  async function dispararNotificacoes() {
    setDisparando(true);
    setResultado(null);
    fetch("/api/cron/notificacoes", { method: "POST" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    setResultado({ info: "Notificações disparadas! Verifique o histórico em instantes." });
    setDisparando(false);
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {/* Status da API */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${evolutionConfigurada ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        {evolutionConfigurada ? (
          <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        )}
        <div>
          <p className={`text-sm font-medium ${evolutionConfigurada ? "text-emerald-800" : "text-amber-800"}`}>
            {evolutionConfigurada
              ? provedor === "zapi" ? "Z-API configurada — envio automático ativo"
              : provedor === "fonnte" ? "Fonnte configurada — envio automático ativo"
              : "Evolution API configurada — envio automático ativo"
              : "Nenhuma API configurada — envio manual via WhatsApp"}
          </p>
          <p className={`text-xs mt-0.5 ${evolutionConfigurada ? "text-emerald-600" : "text-amber-600"}`}>
            {evolutionConfigurada
              ? "As notificações são enviadas automaticamente todo dia às 08:00."
              : "Configure ZAPI_INSTANCE_ID e ZAPI_TOKEN (Z-API) no arquivo .env.local para envio automático. Use os links abaixo para envio manual."}
          </p>
        </div>
      </div>

      {/* Provas nos próximos 7 dias */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Provas nos próximos 7 dias</h2>
          <button
            onClick={dispararNotificacoes}
            disabled={disparando}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {disparando ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {disparando ? "Verificando..." : "Disparar notificações agora"}
          </button>
        </div>

        {avaliacoes.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma prova nos próximos 7 dias.</p>
        ) : (
          <div className="space-y-2">
            {avaliacoes.map((av) => {
              const dataProva = parseDataLocal(av.data);
              const diasRestantes = Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={av.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-medium text-slate-700 text-sm">{av.nome}</span>
                    {av.materia && <span className="text-slate-500 text-sm ml-2">· {av.materia.nome}</span>}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {av.unidade.escola.nome} · {av.unidade.nome} · {av.serie}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className={`text-sm font-bold ${diasRestantes === 0 ? "text-red-600" : diasRestantes <= 2 ? "text-amber-600" : "text-indigo-600"}`}>
                      {diasRestantes === 0 ? "Hoje" : diasRestantes === 1 ? "Amanhã" : `${diasRestantes} dias`}
                    </span>
                    <p className="text-xs text-slate-400">{format(dataProva, "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resultado do disparo */}
      {resultado && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Resultado do disparo</h2>
          {resultado.enviadas > 0 && (
            <p className="text-sm text-emerald-600 mb-3 flex items-center gap-1">
              <CheckCircle2 size={15} />
              {resultado.enviadas} mensagem(ns) enviada(s) via Evolution API.
            </p>
          )}
          {resultado.pendentes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma notificação pendente.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-700 font-medium">
                {resultado.pendentes.length} mensagem(ns) pendente(s) — envie manualmente:
              </p>
              {resultado.pendentes.map((p, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{p.professorNome}</span>
                    <a
                      href={`https://wa.me/${p.numero}?text=${encodeURIComponent(p.mensagem)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageCircle size={13} />
                      Enviar no WhatsApp
                    </a>
                  </div>
                  <pre className="text-xs text-slate-500 bg-slate-50 rounded p-2 whitespace-pre-wrap font-sans">
                    {p.mensagem}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Histórico de notificações enviadas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Professor</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Avaliação</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Dias antes</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Enviado em</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historico.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-700">{n.professora.usuario.nome}</td>
                    <td className="py-2 px-3 text-slate-600">
                      {n.avaliacao.nome}
                      {n.avaliacao.materia && <span className="text-slate-400 ml-1">· {n.avaliacao.materia.nome}</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{n.diasAntes === 0 ? "No dia" : `${n.diasAntes} dias antes`}</td>
                    <td className="py-2 px-3 text-slate-400 text-xs">
                      {format(new Date(n.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-2 px-3">
                      {n.enviada ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 size={12} /> Enviada
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <Clock size={12} /> Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

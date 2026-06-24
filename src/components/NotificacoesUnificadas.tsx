"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Send, MessageCircle, CheckCircle2, Clock, RefreshCw,
  AlertTriangle, MessageSquare, Mail, XCircle, Search, MailCheck, RotateCcw,
} from "lucide-react";
import { montarMensagem, formatarWhatsapp } from "@/lib/notificacoes";

// ── Tipos ────────────────────────────────────────────────────────────────────
type Avaliacao = {
  id: string; nome: string; serie: string; data: string; periodo: string | null;
  materia: { nome: string } | null;
  unidade: { nome: string; escola: { nome: string } };
  notificacoes: { professoraId: string; diasAntes: number; enviada: boolean }[];
};

type HistoricoWhatsapp = {
  id: string; whatsapp: string; diasAntes: number; enviada: boolean; criadoEm: string;
  emailEnviado: boolean; email: string | null;
  professora: { usuario: { nome: string } };
  avaliacao: { nome: string; data: string; materia: { nome: string } | null; unidade: { nome: string; escola: { nome: string } } };
};

type AulaProxima = {
  id: string; data: string; horaInicio: string | null; horaFim: string | null;
  notificacaoEnviada: boolean;
  aluno: { nome: string; responsavel: string | null; telefoneResponsavel: string | null };
  professora: { usuario: { nome: string } };
  materia: { nome: string } | null;
};

type HistoricoAula = {
  id: string; enviada: boolean; whatsapp: string; criadoEm: string;
  agendaAula: {
    data: string; horaInicio: string | null; horaFim: string | null;
    aluno: { nome: string; responsavel: string | null };
    professora: { usuario: { nome: string } };
    materia: { nome: string } | null;
  };
};

type HistoricoEmail = {
  id: string; diasAntes: number; emailEnviado: boolean; email: string; criadoEm: string;
  enviada: boolean; whatsapp: string | null;
  professor: string;
  avaliacao: { nome: string; serie: string; data: string; materia: string | null; escola: string; unidade: string };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDataLocal(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmtDataHora(iso: string) { return format(new Date(iso), "dd/MM HH:mm", { locale: ptBR }); }
function fmtData(iso: string)     { return format(parseDataLocal(iso), "dd/MM/yyyy", { locale: ptBR }); }

function BadgeDias({ dias }: { dias: number }) {
  const label = dias === 0 ? "No dia" : dias === 1 ? "1 dia antes" : `${dias} dias antes`;
  const cls   = dias === 0 ? "bg-red-100 text-red-700" : dias === 1 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

// ── Menu de contexto ──────────────────────────────────────────────────────────
type ContextMenuState = {
  x: number; y: number;
  registroId: string;
  canal: "whatsapp" | "email";
  jaEnviado: boolean;
} | null;

function ContextMenu({
  menu, onClose, onReenviar,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onReenviar: (id: string, canal: "whatsapp" | "email") => Promise<void>;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);

  useEffect(() => {
    function onMouse(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  if (!menu) return null;

  async function handleClick() {
    if (!menu) return;
    setEnviando(true); setMsg(null);
    try {
      const res  = await fetch("/api/notificacoes/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: menu.registroId, canal: menu.canal }),
      });
      const data = await res.json();
      setMsg({ ok: res.ok, txt: res.ok ? "Enviado com sucesso!" : (data.erro ?? "Erro ao enviar.") });
      if (res.ok) setTimeout(() => { onClose(); setMsg(null); router.refresh(); }, 1500);
    } finally {
      setEnviando(false);
    }
  }

  const labelCanal = menu.canal === "whatsapp" ? "WhatsApp" : "E-mail";
  const labelAcao  = menu.jaEnviado ? `Reenviar via ${labelCanal}` : `Enviar via ${labelCanal}`;
  const IconCanal  = menu.canal === "whatsapp" ? MessageSquare : Mail;

  return (
    <div
      ref={ref}
      style={{ top: menu.y, left: menu.x }}
      className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[220px]"
    >
      <div className="px-3 py-2 border-b border-slate-100 mb-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notificação</p>
      </div>
      <button
        onClick={handleClick}
        disabled={enviando}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        {enviando
          ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          : menu.jaEnviado ? <RotateCcw size={14} className="text-indigo-500" /> : <IconCanal size={14} className="text-indigo-500" />
        }
        {enviando ? "Enviando..." : labelAcao}
      </button>
      {msg && (
        <p className={`px-3 py-2 text-xs font-medium ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>
          {msg.txt}
        </p>
      )}
    </div>
  );
}

// ── Componente raiz ────────────────────────────────────────────────────────────
export default function NotificacoesUnificadas({
  avaliacoes, historicoWhatsapp, whatsappConfigurado, provedor,
  historicoEmail, emailAtivo, historicoAulas, aulasProximas,
}: {
  avaliacoes: Avaliacao[];
  historicoWhatsapp: HistoricoWhatsapp[];
  whatsappConfigurado: boolean;
  provedor?: "fonnte" | "zapi" | "evolution" | null;
  historicoEmail: HistoricoEmail[];
  emailAtivo: boolean;
  historicoAulas: HistoricoAula[];
  aulasProximas: AulaProxima[];
}) {
  const [aba, setAba] = useState<"whatsapp" | "email">("whatsapp");

  return (
    <div className="space-y-5">
      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setAba("whatsapp")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            aba === "whatsapp" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <MessageSquare size={15} />WhatsApp
        </button>
        <button
          onClick={() => setAba("email")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            aba === "email" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Mail size={15} />E-mail
        </button>
      </div>

      {aba === "whatsapp" && (
        <AbaWhatsapp
          avaliacoes={avaliacoes}
          historico={historicoWhatsapp}
          historicoAulas={historicoAulas}
          aulasProximas={aulasProximas}
          whatsappConfigurado={whatsappConfigurado}
          provedor={provedor}
        />
      )}
      {aba === "email" && (
        <AbaEmail historico={historicoEmail} emailAtivo={emailAtivo} avaliacoes={avaliacoes} />
      )}
    </div>
  );
}

// ── Aba WhatsApp ──────────────────────────────────────────────────────────────
function AbaWhatsapp({
  avaliacoes, historico, historicoAulas, aulasProximas, whatsappConfigurado, provedor,
}: {
  avaliacoes: Avaliacao[];
  historico: HistoricoWhatsapp[];
  historicoAulas: HistoricoAula[];
  aulasProximas: AulaProxima[];
  whatsappConfigurado: boolean;
  provedor?: "fonnte" | "zapi" | "evolution" | null;
}) {
  const router = useRouter();
  const [disparando, setDisparando]   = useState(false);
  const [resultado, setResultado]     = useState<{ enviadas: number; pendentes: any[] } | null>(null);
  const [msgDisparoWpp, setMsgDisparoWpp] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [statusLocal, setStatusLocal] = useState<Record<string, boolean>>({});

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  async function dispararNotificacoes() {
    setDisparando(true); setResultado(null); setMsgDisparoWpp(null);
    fetch("/api/cron/notificacoes/whatsapp", { method: "POST" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    setMsgDisparoWpp("Notificações disparadas! Verifique o histórico em instantes.");
    setDisparando(false);
    setTimeout(() => { setMsgDisparoWpp(null); router.refresh(); }, 4000);
  }

  function abrirMenu(e: React.MouseEvent, id: string, jaEnviado: boolean) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, registroId: id, canal: "whatsapp", jaEnviado });
  }

  const reenviar = useCallback(async (id: string, canal: "whatsapp" | "email") => {
    const res = await fetch("/api/notificacoes/reenviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, canal }),
    });
    if (res.ok) setStatusLocal((prev) => ({ ...prev, [id]: true }));
  }, []);

  return (
    <div className="space-y-5">
      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} onReenviar={reenviar} />

      {/* Status API */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${whatsappConfigurado ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        {whatsappConfigurado
          ? <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          : <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        }
        <div>
          <p className={`text-sm font-medium ${whatsappConfigurado ? "text-emerald-800" : "text-amber-800"}`}>
            {whatsappConfigurado
              ? provedor === "zapi" ? "Z-API configurada — envio automático ativo"
              : provedor === "fonnte" ? "Fonnte configurada — envio automático ativo"
              : "Evolution API configurada — envio automático ativo"
              : "Nenhuma API configurada — envio manual via WhatsApp"}
          </p>
          <p className={`text-xs mt-0.5 ${whatsappConfigurado ? "text-emerald-600" : "text-amber-600"}`}>
            {whatsappConfigurado
              ? "As notificações são enviadas automaticamente todo dia às 08:00."
              : "Configure ZAPI_INSTANCE_ID e ZAPI_TOKEN no .env.local para envio automático."}
          </p>
        </div>
      </div>

      {/* Botão disparar + feedback */}
      <div className="flex items-center gap-4">
        <button onClick={dispararNotificacoes} disabled={disparando}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {disparando ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
          {disparando ? "Verificando..." : "Disparar agora"}
        </button>
        {msgDisparoWpp && (
          <p className="text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={14} /> {msgDisparoWpp}
          </p>
        )}
      </div>

      {/* Provas próximos 7 dias */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Provas nos próximos 7 dias</h2>
        {avaliacoes.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma prova nos próximos 7 dias.</p>
        ) : (
          <div className="space-y-2">
            {avaliacoes.map((av) => {
              const dataProva = parseDataLocal(av.data);
              const dias = Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={av.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-medium text-slate-700 text-sm">{av.nome}</span>
                    {av.materia && <span className="text-slate-500 text-sm ml-2">· {av.materia.nome}</span>}
                    <p className="text-xs text-slate-400 mt-0.5">{av.unidade.escola.nome} · {av.unidade.nome} · {av.serie}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className={`text-sm font-bold ${dias === 0 ? "text-red-600" : dias <= 2 ? "text-amber-600" : "text-indigo-600"}`}>
                      {dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `${dias} dias`}
                    </span>
                    <p className="text-xs text-slate-400">{fmtData(av.data)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aulas próximas 7 dias */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Aulas nos próximos 7 dias</h2>
        {aulasProximas.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma aula nos próximos 7 dias com responsável cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {aulasProximas.map((aula) => {
              const dataAula = parseDataLocal(aula.data);
              const diasAula = Math.round((dataAula.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              const horario = aula.horaInicio
                ? aula.horaFim ? `${aula.horaInicio}–${aula.horaFim}` : aula.horaInicio
                : null;
              return (
                <div key={aula.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-medium text-slate-700 text-sm">{aula.aluno.nome}</span>
                    {aula.materia && <span className="text-slate-500 text-sm ml-2">· {aula.materia.nome}</span>}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {aula.aluno.responsavel && <>{aula.aluno.responsavel} · </>}
                      {aula.aluno.telefoneResponsavel}
                      {horario && <> · {horario}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4 flex flex-col items-end gap-1">
                    <span className={`text-sm font-bold ${diasAula === 0 ? "text-red-600" : diasAula === 1 ? "text-amber-600" : "text-indigo-600"}`}>
                      {diasAula === 0 ? "Hoje" : diasAula === 1 ? "Amanhã" : `${diasAula} dias`}
                    </span>
                    <p className="text-xs text-slate-400">{fmtData(aula.data)}</p>
                    {aula.notificacaoEnviada ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Enviado</span>
                    ) : diasAula === 1 ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pendente</span>
                    ) : null}
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
              <CheckCircle2 size={15} /> {resultado.enviadas} mensagem(ns) enviada(s).
            </p>
          )}
          {resultado.pendentes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma notificação pendente.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-700 font-medium">{resultado.pendentes.length} mensagem(ns) pendente(s) — envie manualmente:</p>
              {resultado.pendentes.map((p: any, i: number) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{p.professorNome}</span>
                    <a href={`https://wa.me/${p.numero}?text=${encodeURIComponent(p.mensagem)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                      <MessageCircle size={13} /> Enviar no WhatsApp
                    </a>
                  </div>
                  <pre className="text-xs text-slate-500 bg-slate-50 rounded p-2 whitespace-pre-wrap font-sans">{p.mensagem}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Histórico WhatsApp */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <MessageSquare size={15} className="text-emerald-600" />
          <h2 className="font-semibold text-slate-800">Histórico de notificações WhatsApp</h2>
        </div>
        {historico.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Nenhuma notificação enviada ainda. Clique em "Disparar agora" para enviar.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Canal</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Professor</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Avaliação</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Antecedência</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Enviado em</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historico.map((n) => {
                    const enviada = statusLocal[n.id] ?? n.enviada;
                    return (
                      <tr key={n.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4">
                          <span
                            title="Botão direito para enviar/reenviar via WhatsApp"
                            onContextMenu={(e) => abrirMenu(e, n.id, enviada)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium cursor-context-menu select-none hover:bg-emerald-200 transition-colors"
                          >
                            <MessageSquare size={10}/>WhatsApp
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 text-xs">{n.professora.usuario.nome}</td>
                        <td className="py-2.5 px-4 text-slate-600 text-xs">
                          {n.avaliacao.nome}
                          {n.avaliacao.materia && <span className="text-slate-400 ml-1">· {n.avaliacao.materia.nome}</span>}
                        </td>
                        <td className="py-2.5 px-4"><BadgeDias dias={n.diasAntes} /></td>
                        <td className="py-2.5 px-4 text-slate-400 text-xs">{fmtDataHora(n.criadoEm)}</td>
                        <td className="py-2.5 px-4">
                          {enviada
                            ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 size={12}/> Enviado</span>
                            : <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle size={12}/> Falha</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-400">{historico.length} registro(s)</p>
              <button
                onClick={async () => {
                  if (!confirm("Deseja limpar todo o histórico de notificações?")) return;
                  await fetch("/api/notificacoes/limpar", { method: "DELETE" });
                  router.refresh();
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Limpar histórico
              </button>
            </div>
          </>
        )}
      </div>

      {/* Histórico de notificações de aula para responsáveis */}
      {historicoAulas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare size={15} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Histórico — Lembretes de Aula (Responsáveis)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Aluno</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Responsável</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Aula</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Data</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Enviado em</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historicoAulas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-700 text-xs font-medium">{n.agendaAula.aluno.nome}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs">{n.agendaAula.aluno.responsavel ?? "—"}</td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs">
                      {n.agendaAula.materia?.nome ?? "—"}
                      {n.agendaAula.horaInicio && (
                        <span className="text-slate-400 ml-1">
                          · {n.agendaAula.horaInicio}{n.agendaAula.horaFim ? ` – ${n.agendaAula.horaFim}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-xs">{fmtData(n.agendaAula.data)}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-xs">{fmtDataHora(n.criadoEm)}</td>
                    <td className="py-2.5 px-4">
                      {n.enviada
                        ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 size={12}/> Enviado</span>
                        : <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle size={12}/> Falha</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">{historicoAulas.length} registro(s)</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba E-mail ────────────────────────────────────────────────────────────────
function AbaEmail({ historico, emailAtivo, avaliacoes }: { historico: HistoricoEmail[]; emailAtivo: boolean; avaliacoes: Avaliacao[] }) {
  const router = useRouter();
  const [busca, setBusca]               = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "enviado" | "falhou">("todos");
  const [disparando, setDisparando]     = useState(false);
  const [msgDisparo, setMsgDisparo]     = useState<{ ok: boolean; txt: string } | null>(null);
  const [contextMenu, setContextMenu]   = useState<ContextMenuState>(null);
  const [statusLocal, setStatusLocal]   = useState<Record<string, boolean>>({});

  const registros = useMemo(() => historico.filter((r) => {
    const emailOk = statusLocal[r.id] ?? r.emailEnviado;
    const textoOk = !busca || [r.professor, r.email, r.avaliacao.nome, r.avaliacao.escola, r.avaliacao.serie]
      .some((s) => s.toLowerCase().includes(busca.toLowerCase()));
    const statusOk =
      filtroStatus === "todos" ||
      (filtroStatus === "enviado" && emailOk) ||
      (filtroStatus === "falhou" && !emailOk);
    return textoOk && statusOk;
  }), [historico, busca, filtroStatus, statusLocal]);

  const totalEnviados = historico.filter((r) => (statusLocal[r.id] ?? r.emailEnviado)).length;
  const totalFalhos   = historico.length - totalEnviados;

  async function dispararAgora() {
    setDisparando(true); setMsgDisparo(null);
    try {
      fetch("/api/cron/notificacoes/email", { method: "POST" }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
      setMsgDisparo({ ok: true, txt: "Notificações disparadas! Verifique o histórico em instantes." });
      setTimeout(() => router.refresh(), 3000);
    } catch {
      setMsgDisparo({ ok: false, txt: "Falha ao disparar notificações." });
    } finally {
      setDisparando(false);
      setTimeout(() => setMsgDisparo(null), 6000);
    }
  }

  function abrirMenu(e: React.MouseEvent, id: string, jaEnviado: boolean) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, registroId: id, canal: "email", jaEnviado });
  }

  const reenviar = useCallback(async (id: string, canal: "whatsapp" | "email") => {
    const res = await fetch("/api/notificacoes/reenviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, canal }),
    });
    if (res.ok) setStatusLocal((prev) => ({ ...prev, [id]: true }));
  }, []);

  return (
    <div className="space-y-5">
      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} onReenviar={reenviar} />

      {/* Aviso SMTP */}
      {!emailAtivo && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            E-mail SMTP não configurado. Configure{" "}
            <code className="bg-amber-100 px-1 rounded text-xs">EMAIL_HOST</code>,{" "}
            <code className="bg-amber-100 px-1 rounded text-xs">EMAIL_USER</code> e{" "}
            <code className="bg-amber-100 px-1 rounded text-xs">EMAIL_PASS</code> no <code className="bg-amber-100 px-1 rounded text-xs">.env.local</code>.
          </p>
        </div>
      )}

      {/* Provas próximos 7 dias */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Provas nos próximos 7 dias</h2>
        {avaliacoes.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma prova nos próximos 7 dias.</p>
        ) : (
          <div className="space-y-2">
            {avaliacoes.map((av) => {
              const dataProva = parseDataLocal(av.data);
              const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
              const dias = Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={av.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-medium text-slate-700 text-sm">{av.nome}</span>
                    {av.materia && <span className="text-slate-500 text-sm ml-2">· {av.materia.nome}</span>}
                    <p className="text-xs text-slate-400 mt-0.5">{av.unidade.escola.nome} · {av.unidade.nome} · {av.serie}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className={`text-sm font-bold ${dias === 0 ? "text-red-600" : dias <= 2 ? "text-amber-600" : "text-indigo-600"}`}>
                      {dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `${dias} dias`}
                    </span>
                    <p className="text-xs text-slate-400">{fmtData(av.data)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

      {/* Barra filtros + disparar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar professor, e-mail, avaliação, escola..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["todos","enviado","falhou"] as const).map((v) => (
            <button key={v} onClick={() => setFiltroStatus(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filtroStatus === v ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}>
              {v === "todos" ? "Todos" : v === "enviado" ? "Enviados" : "Falhas"}
            </button>
          ))}
        </div>
        <button onClick={dispararAgora} disabled={disparando || !emailAtivo}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
          {disparando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MailCheck size={14} />}
          Disparar agora
        </button>
      </div>

      {/* Feedback disparo */}
      {msgDisparo && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msgDisparo.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {msgDisparo.txt}
        </div>
      )}

      {/* Tabela histórico e-mail */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Mail size={15} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Histórico de notificações E-mail</h2>
        </div>
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Canal</th>
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
                {registros.map((r) => {
                  const emailOk = statusLocal[r.id] ?? r.emailEnviado;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          title="Botão direito para enviar/reenviar via E-mail"
                          onContextMenu={(e) => abrirMenu(e, r.id, emailOk)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium cursor-context-menu select-none hover:bg-indigo-200 transition-colors"
                        >
                          <Mail size={10}/>E-mail
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDataHora(r.criadoEm)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-800">{r.professor}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.email}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700 text-xs">{r.avaliacao.nome}</p>
                        <p className="text-xs text-slate-400">
                          {r.avaliacao.materia ? `${r.avaliacao.materia} · ` : ""}
                          {r.avaliacao.serie} · {r.avaliacao.escola}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtData(r.avaliacao.data)}</td>
                      <td className="px-4 py-3"><BadgeDias dias={r.diasAntes} /></td>
                      <td className="px-4 py-3">
                        {emailOk
                          ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 size={12}/> Enviado</span>
                          : <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle size={12}/> Falhou</span>
                        }
                      </td>
                    </tr>
                  );
                })}
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

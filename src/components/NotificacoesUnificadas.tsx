"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Send, MessageCircle, CheckCircle2, Clock, RefreshCw,
  AlertTriangle, MessageSquare, Mail, XCircle, Search, MailCheck, RotateCcw, PauseCircle, PlayCircle,
} from "lucide-react";
import { montarMensagem, formatarWhatsapp } from "@/lib/notificacoes";

// ── Tipos ────────────────────────────────────────────────────────────────────
type Avaliacao = {
  id: string; nome: string; serie: string; data: string; periodo: string | null;
  materia: { nome: string } | null;
  unidade: { nome: string; escola: { nome: string } };
  notificacoes: { id: string; professoraId: string; diasAntes: number; enviada: boolean; emailEnviado: boolean; criadoEm: string }[];
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
  notificacaoCriadoEm: string | null;
  aluno: { nome: string; responsavel: string | null; telefoneResponsavel: string | null };
  professora: { usuario: { nome: string } };
  materia: { nome: string } | null;
};

type HistoricoAula = {
  id: string; agendaAulaId: string; enviada: boolean; whatsapp: string; criadoEm: string;
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
  tipo: "prova" | "aula";
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
        body: JSON.stringify({ id: menu.registroId, canal: menu.canal, tipo: menu.tipo }),
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
  avaliacoes, historicoWhatsapp, whatsappConfigurado, provedor, whatsappPausado,
  historicoEmail, emailAtivo, emailPausado, historicoAulas, aulasProximas,
}: {
  avaliacoes: Avaliacao[];
  historicoWhatsapp: HistoricoWhatsapp[];
  whatsappConfigurado: boolean;
  provedor?: "fonnte" | "zapi" | "evolution" | null;
  whatsappPausado: boolean;
  historicoEmail: HistoricoEmail[];
  emailAtivo: boolean;
  emailPausado: boolean;
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
          whatsappPausadoInicial={whatsappPausado}
        />
      )}
      {aba === "email" && (
        <AbaEmail historico={historicoEmail} emailAtivo={emailAtivo} avaliacoes={avaliacoes} emailPausadoInicial={emailPausado} />
      )}
    </div>
  );
}

// ── Aba WhatsApp ──────────────────────────────────────────────────────────────
function AbaWhatsapp({
  avaliacoes, historico, historicoAulas, aulasProximas, whatsappConfigurado, provedor, whatsappPausadoInicial,
}: {
  avaliacoes: Avaliacao[];
  historico: HistoricoWhatsapp[];
  historicoAulas: HistoricoAula[];
  aulasProximas: AulaProxima[];
  whatsappConfigurado: boolean;
  provedor?: "fonnte" | "zapi" | "evolution" | null;
  whatsappPausadoInicial: boolean;
}) {
  const router = useRouter();
  const [disparando, setDisparando]   = useState(false);
  const [resultado, setResultado]     = useState<{ enviadas: number; pendentes: any[] } | null>(null);
  const [msgDisparoWpp, setMsgDisparoWpp] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [statusLocal, setStatusLocal] = useState<Record<string, boolean>>({});
  const [busca, setBusca]               = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "enviado" | "falhou">("todos");
  const [pausado, setPausado]           = useState(whatsappPausadoInicial);
  const [alternandoPausa, setAlternandoPausa] = useState(false);

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  async function alternarPausa() {
    const novoValor = !pausado;
    setAlternandoPausa(true);
    try {
      const res = await fetch("/api/notificacoes/whatsapp-pausado", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausado: novoValor }),
      });
      if (res.ok) setPausado(novoValor);
    } finally {
      setAlternandoPausa(false);
    }
  }

  async function dispararNotificacoes() {
    setDisparando(true); setResultado(null); setMsgDisparoWpp(null);
    fetch("/api/cron/notificacoes/whatsapp", { method: "POST" }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    setMsgDisparoWpp("Notificações disparadas! Verifique o histórico em instantes.");
    setDisparando(false);
    setTimeout(() => { setMsgDisparoWpp(null); router.refresh(); }, 4000);
  }

  function abrirMenu(e: React.MouseEvent, id: string, jaEnviado: boolean, tipo: "prova" | "aula" = "prova") {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, registroId: id, canal: "whatsapp", jaEnviado, tipo });
  }

  const reenviar = useCallback(async (id: string, canal: "whatsapp" | "email") => {
    const res = await fetch("/api/notificacoes/reenviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, canal }),
    });
    if (res.ok) setStatusLocal((prev) => ({ ...prev, [id]: true }));
  }, []);

  const { todasLinhas, totalEnviados, totalFalhos, linhasFiltradas } = useMemo(() => {
    const linhasProva = historico.map((n) => ({
      key: `p-${n.id}`,
      tipo: "Prova" as const,
      destinatario: n.professora.usuario.nome,
      descricao: n.avaliacao.nome + (n.avaliacao.materia ? ` · ${n.avaliacao.materia.nome}` : ""),
      detalhe: <BadgeDias dias={n.diasAntes} />,
      criadoEm: n.criadoEm,
      enviada: statusLocal[n.id] ?? n.enviada,
      searchText: `${n.professora.usuario.nome} ${n.avaliacao.nome} ${n.avaliacao.materia?.nome ?? ""}`.toLowerCase(),
      onContextMenu: (e: React.MouseEvent) => abrirMenu(e, n.id, statusLocal[n.id] ?? n.enviada),
    }));
    const linhasAula = historicoAulas.map((n) => ({
      key: `a-${n.id}`,
      tipo: "Lembrete de Aula" as const,
      destinatario: n.agendaAula.aluno.responsavel ?? "—",
      descricao: (n.agendaAula.materia?.nome ?? "—") + (n.agendaAula.horaInicio ? ` · ${n.agendaAula.horaInicio}${n.agendaAula.horaFim ? `–${n.agendaAula.horaFim}` : ""}` : ""),
      detalhe: <span className="text-xs text-slate-400">{fmtData(n.agendaAula.data)}</span>,
      criadoEm: n.criadoEm,
      enviada: statusLocal[n.agendaAulaId] ?? n.enviada,
      searchText: `${n.agendaAula.aluno.nome} ${n.agendaAula.aluno.responsavel ?? ""} ${n.agendaAula.materia?.nome ?? ""}`.toLowerCase(),
      onContextMenu: (e: React.MouseEvent) => abrirMenu(e, n.agendaAulaId, statusLocal[n.agendaAulaId] ?? n.enviada, "aula"),
    }));
    const todasLinhas = [...linhasProva, ...linhasAula].sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
    const totalEnviados = todasLinhas.filter((l) => l.enviada).length;
    const totalFalhos   = todasLinhas.length - totalEnviados;
    const linhasFiltradas = todasLinhas.filter((l) => {
      const textoOk  = busca === "" || l.searchText.includes(busca.toLowerCase()) || l.destinatario.toLowerCase().includes(busca.toLowerCase()) || l.descricao.toLowerCase().includes(busca.toLowerCase());
      const statusOk = filtroStatus === "todos" || (filtroStatus === "enviado" ? l.enviada : !l.enviada);
      return textoOk && statusOk;
    });
    return { todasLinhas, totalEnviados, totalFalhos, linhasFiltradas };
  }, [historico, historicoAulas, statusLocal, busca, filtroStatus]);

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
              : "Configure FONNTE_TOKEN (ou EVOLUTION_API_URL/EVOLUTION_API_KEY/EVOLUTION_INSTANCE) no .env.local para envio automático."}
          </p>
        </div>
      </div>

      {/* Pausa do envio automático */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${pausado ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
        <div className="flex items-start gap-3">
          {pausado
            ? <PauseCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
            : <PlayCircle size={18} className="text-slate-400 mt-0.5 shrink-0" />
          }
          <div>
            <p className={`text-sm font-medium ${pausado ? "text-red-800" : "text-slate-700"}`}>
              {pausado ? "Envio automático de WhatsApp pausado" : "Envio automático de WhatsApp ativo"}
            </p>
            <p className={`text-xs mt-0.5 ${pausado ? "text-red-600" : "text-slate-500"}`}>
              {pausado
                ? "O disparo diário das 08:00 e o botão \"Disparar agora\" não enviam mensagens enquanto pausado. Reenvio manual de um item específico continua funcionando."
                : "Pause temporariamente o envio automático sem perder as configurações."}
            </p>
          </div>
        </div>
        <button
          onClick={alternarPausa}
          disabled={alternandoPausa}
          className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60 ${
            pausado ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
          }`}
        >
          {alternandoPausa ? <RefreshCw size={13} className="animate-spin" /> : pausado ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
          {alternandoPausa ? "Salvando..." : pausado ? "Retomar envio" : "Pausar envio"}
        </button>
      </div>

      {/* Botão disparar + feedback */}
      <div className="flex items-center gap-4">
        <button onClick={dispararNotificacoes} disabled={disparando || pausado}
          title={pausado ? "Retome o envio automático para disparar notificações" : undefined}
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

      {/* Próximos 7 dias — tabela unificada */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <MessageSquare size={15} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Próximos 7 dias</h2>
        </div>
        {avaliacoes.length === 0 && aulasProximas.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Nenhuma prova ou aula nos próximos 7 dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Tipo</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Descrição</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Detalhe</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Data</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Prazo</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {avaliacoes.map((av) => {
                  const dataProva = parseDataLocal(av.data);
                  const dias = Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                  const registrosOrdenados = [...av.notificacoes]
                    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
                  const ultimoEmail    = registrosOrdenados.find((n) => n.emailEnviado);
                  // Registro mais recente (qualquer professor/dias) — alvo do clique direito
                  // pra enviar/reenviar via WhatsApp. Se a avaliação tiver mais de um
                  // professor vinculado, age sobre o registro mais recente entre eles.
                  const ultimoRegistro = registrosOrdenados[0];
                  const wppEnviado = ultimoRegistro?.enviada ?? false;
                  return (
                    <tr key={`av-${av.id}`} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <span
                          onContextMenu={ultimoRegistro ? (e) => abrirMenu(e, ultimoRegistro.id, wppEnviado, "prova") : undefined}
                          title={ultimoRegistro ? "Botão direito para enviar/reenviar via WhatsApp" : "Ainda não processado pelo envio automático"}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium select-none transition-opacity ${
                            ultimoRegistro ? "cursor-context-menu hover:opacity-80" : ""
                          }`}
                        >
                          Prova
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 text-xs font-medium">
                        {av.nome}{av.materia && <span className="text-slate-400 ml-1 font-normal">· {av.materia.nome}</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-xs">{av.unidade.escola.nome} · {av.unidade.nome} · {av.serie}</td>
                      <td className="py-2.5 px-4 text-slate-400 text-xs">{fmtData(av.data)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-bold ${dias === 0 ? "text-red-600" : dias <= 2 ? "text-amber-600" : "text-indigo-600"}`}>
                          {dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `${dias} dias`}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1 text-xs">
                          <MessageSquare size={11} className="text-slate-400 shrink-0"/>
                          {wppEnviado
                            ? <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 size={12}/> Enviado<span className="text-slate-400 font-normal">· {fmtDataHora(ultimoRegistro!.criadoEm)}</span></span>
                            : <span className="text-slate-400">—</span>
                          }
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Mail size={11} className="text-slate-400 shrink-0"/>
                          {ultimoEmail
                            ? <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 size={12}/> Enviado<span className="text-slate-400 font-normal">· {fmtDataHora(ultimoEmail.criadoEm)}</span></span>
                            : <span className="text-slate-400">—</span>
                          }
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {aulasProximas.map((aula) => {
                  const dataAula = parseDataLocal(aula.data);
                  const diasAula = Math.round((dataAula.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                  const horario = aula.horaInicio
                    ? aula.horaFim ? `${aula.horaInicio}–${aula.horaFim}` : aula.horaInicio
                    : null;
                  return (
                    <tr key={`aula-${aula.id}`} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <span
                          onContextMenu={(e) => abrirMenu(e, aula.id, aula.notificacaoEnviada, "aula")}
                          title="Botão direito para enviar/reenviar via WhatsApp"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium cursor-context-menu select-none hover:opacity-80 transition-opacity"
                        >
                          Aula
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 text-xs font-medium">
                        {aula.aluno.nome}{aula.materia && <span className="text-slate-400 ml-1 font-normal">· {aula.materia.nome}</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-xs">
                        {aula.aluno.responsavel && <>{aula.aluno.responsavel} · </>}{aula.aluno.telefoneResponsavel}{horario && <> · {horario}</>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-xs">{fmtData(aula.data)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-bold ${diasAula === 0 ? "text-red-600" : diasAula === 1 ? "text-amber-600" : "text-indigo-600"}`}>
                          {diasAula === 0 ? "Hoje" : diasAula === 1 ? "Amanhã" : `${diasAula} dias`}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {aula.notificacaoEnviada
                          ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium" title={aula.notificacaoCriadoEm ? `Enviado em ${fmtDataHora(aula.notificacaoCriadoEm)}` : undefined}>
                              <CheckCircle2 size={12}/> Enviado{aula.notificacaoCriadoEm && <span className="text-slate-400 font-normal">· {fmtDataHora(aula.notificacaoCriadoEm)}</span>}
                            </span>
                          )
                          : diasAula === 1
                            ? <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><Clock size={12}/> Pendente</span>
                            : <span className="text-slate-400 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      {/* Histórico unificado WhatsApp */}
      <>
            {/* Cards resumo */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 mb-1">Total registrado</p>
                <p className="text-2xl font-bold text-slate-800">{todasLinhas.length}</p>
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

            {/* Barra filtros */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar destinatário, descrição..."
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
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <MessageSquare size={15} className="text-emerald-600" />
                <h2 className="font-semibold text-slate-800">Histórico de notificações WhatsApp</h2>
              </div>
              {linhasFiltradas.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">
                  {todasLinhas.length === 0 ? "Nenhuma notificação enviada ainda." : "Nenhum resultado para o filtro aplicado."}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Tipo</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Destinatário</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Descrição</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Detalhe</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Enviado em</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {linhasFiltradas.map((l) => (
                          <tr key={l.key} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4">
                              <span
                                title="Botão direito para enviar/reenviar via WhatsApp"
                                onContextMenu={l.onContextMenu}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-context-menu select-none hover:opacity-80 transition-opacity ${l.tipo === "Prova" ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}
                              >
                                {l.tipo}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 text-xs">{l.destinatario}</td>
                            <td className="py-2.5 px-4 text-slate-600 text-xs">{l.descricao}</td>
                            <td className="py-2.5 px-4">{l.detalhe}</td>
                            <td className="py-2.5 px-4 text-slate-400 text-xs">{fmtDataHora(l.criadoEm)}</td>
                            <td className="py-2.5 px-4">
                              {l.enviada
                                ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 size={12}/> Enviado</span>
                                : <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle size={12}/> Falha</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <p className="text-xs text-slate-400">{linhasFiltradas.length} registro(s)</p>
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
      </>
    </div>
  );
}

// ── Aba E-mail ────────────────────────────────────────────────────────────────
function AbaEmail({
  historico, emailAtivo, avaliacoes, emailPausadoInicial,
}: {
  historico: HistoricoEmail[];
  emailAtivo: boolean;
  avaliacoes: Avaliacao[];
  emailPausadoInicial: boolean;
}) {
  const router = useRouter();
  const [busca, setBusca]               = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "enviado" | "falhou">("todos");
  const [disparando, setDisparando]     = useState(false);
  const [msgDisparo, setMsgDisparo]     = useState<{ ok: boolean; txt: string } | null>(null);
  const [contextMenu, setContextMenu]   = useState<ContextMenuState>(null);
  const [statusLocal, setStatusLocal]   = useState<Record<string, boolean>>({});
  const [pausado, setPausado]           = useState(emailPausadoInicial);
  const [alternandoPausa, setAlternandoPausa] = useState(false);

  async function alternarPausa() {
    const novoValor = !pausado;
    setAlternandoPausa(true);
    try {
      const res = await fetch("/api/notificacoes/email-pausado", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausado: novoValor }),
      });
      if (res.ok) setPausado(novoValor);
    } finally {
      setAlternandoPausa(false);
    }
  }

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

  const totalEnviados = useMemo(
    () => historico.filter((r) => (statusLocal[r.id] ?? r.emailEnviado)).length,
    [historico, statusLocal],
  );
  const totalFalhos = historico.length - totalEnviados;

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
    setContextMenu({ x: e.clientX, y: e.clientY, registroId: id, canal: "email", jaEnviado, tipo: "prova" });
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

      {/* Pausa do envio automático */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${pausado ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
        <div className="flex items-start gap-3">
          {pausado
            ? <PauseCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
            : <PlayCircle size={18} className="text-slate-400 mt-0.5 shrink-0" />
          }
          <div>
            <p className={`text-sm font-medium ${pausado ? "text-red-800" : "text-slate-700"}`}>
              {pausado ? "Envio automático de E-mail pausado" : "Envio automático de E-mail ativo"}
            </p>
            <p className={`text-xs mt-0.5 ${pausado ? "text-red-600" : "text-slate-500"}`}>
              {pausado
                ? "O disparo diário das 08:00 e o botão \"Disparar agora\" não enviam e-mails enquanto pausado. Reenvio manual de um item específico continua funcionando."
                : "Pause temporariamente o envio automático sem perder as configurações."}
            </p>
          </div>
        </div>
        <button
          onClick={alternarPausa}
          disabled={alternandoPausa}
          className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60 ${
            pausado ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
          }`}
        >
          {alternandoPausa ? <RefreshCw size={13} className="animate-spin" /> : pausado ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
          {alternandoPausa ? "Salvando..." : pausado ? "Retomar envio" : "Pausar envio"}
        </button>
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
        <button onClick={dispararAgora} disabled={disparando || !emailAtivo || pausado}
          title={pausado ? "Retome o envio automático para disparar notificações" : undefined}
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

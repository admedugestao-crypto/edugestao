"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, LogOut, Clock,
         CheckCircle2, XCircle, UserX, UserCheck, X, Paperclip, Loader2 } from "lucide-react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Materia  = { id: string; nome: string; cor: string };
type AlunoOpt = { id: string; nome: string; serie: string; turma: string | null; professoraId: string | null; materias: Materia[] };
type ProfOpt  = { id: string; nome: string };
type SlotDisp = { dia: string; inicio: string; fim: string };
type DispProf = { professoraId: string; slots: SlotDisp[] };
type StatusAula = "AGENDADA" | "REALIZADA" | "CANCELADA" | "FALTA_ALUNO" | "FALTA_PROFESSOR";

type Aula = {
  id: string; alunoId: string; materiaId: string | null;
  data: string; horaInicio: string | null; horaFim: string | null;
  status: StatusAula; observacao: string | null;
  aluno:     { id: string; nome: string; serie: string; turma: string | null; materias: { materia: Materia }[] };
  materia:   Materia | null;
  professora: { usuario: { nome: string } };
};

// Conteúdo vinculado a uma aula marcada como Realizada
type ConteudoForm = {
  id?: string;
  alunoId: string;
  materiaId: string | null;
  topico: string;
  descricao: string;
  arquivoUrl: string;
  arquivoNome: string;
  data: string;
  planejadoOriginal: boolean;
};
type ConteudoModalState = { aulaId: string; existente: boolean; form: ConteudoForm };

const DIAS_PT   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DIAS_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

const STATUS_CFG: Record<StatusAula, { label: string; cor: string; bg: string; icon: React.ReactNode }> = {
  AGENDADA:        { label: "Agendada",          cor: "text-slate-600",   bg: "bg-slate-100",   icon: <Clock size={13}/> },
  REALIZADA:       { label: "Realizada",          cor: "text-emerald-700", bg: "bg-emerald-100", icon: <CheckCircle2 size={13}/> },
  CANCELADA:       { label: "Cancelada",          cor: "text-red-700",     bg: "bg-red-100",     icon: <XCircle size={13}/> },
  FALTA_ALUNO:     { label: "Falta do aluno",     cor: "text-amber-700",   bg: "bg-amber-100",   icon: <UserX size={13}/> },
  FALTA_PROFESSOR: { label: "Falta do professor", cor: "text-orange-700",  bg: "bg-orange-100",  icon: <UserCheck size={13}/> },
};

function parseLocal(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toMin(h: string) { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; }
function fromMin(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function subtrair(janelas: { inicio: number; fim: number }[], ocupados: { inicio: number; fim: number }[]) {
  let livres = [...janelas];
  for (const oc of ocupados) {
    livres = livres.flatMap((j) => {
      if (oc.fim <= j.inicio || oc.inicio >= j.fim) return [j];
      const antes  = oc.inicio > j.inicio ? [{ inicio: j.inicio, fim: oc.inicio }] : [];
      const depois = oc.fim    < j.fim    ? [{ inicio: oc.fim,    fim: j.fim    }] : [];
      return [...antes, ...depois];
    });
  }
  return livres.filter((j) => j.fim - j.inicio >= 60);
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function AgendaMobile({
  isProfessor, isAdmin, nomeUsuario,
  professoraIdSessao, professoras, disponibilidades, alunos,
}: {
  isProfessor: boolean; isAdmin: boolean; nomeUsuario: string;
  professoraIdSessao: string;
  professoras: ProfOpt[]; disponibilidades: DispProf[];
  alunos: AlunoOpt[];
}) {
  const router = useRouter();

  const [semana,    setSemana]    = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [diaAtivo,  setDiaAtivo]  = useState(new Date());
  const [aulas,     setAulas]     = useState<Aula[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [filtroProfId, setFiltroProfId] = useState(() => professoras[0]?.id ?? "");

  // Modal nova aula
  const [modalAberto, setModalAberto] = useState(false);
  const [novaAula, setNovaAula] = useState({ alunoId: "", materiaId: "", data: "", horaInicio: "", horaFim: "", observacao: "" });
  const [profModal, setProfModal] = useState("");
  const [salvando, setSalvando]   = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Modal detalhe
  const [detalhe, setDetalhe] = useState<Aula | null>(null);

  // Modal conteúdo (ao marcar aula como Realizada)
  const [conteudoModal, setConteudoModal]     = useState<ConteudoModalState | null>(null);
  const [carregandoConteudo, setCarregandoConteudo] = useState(false);
  const [salvandoConteudo, setSalvandoConteudo]     = useState(false);
  const [enviandoArquivo, setEnviandoArquivo]       = useState(false);
  const [erroConteudo, setErroConteudo]             = useState<string | null>(null);

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(semana, i));

  // ── Carregar aulas ──────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const ini = semana;
      const fim = addDays(semana, 6);
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      let url = `/api/agenda?inicio=${fmt(ini)}&fim=${fmt(fim)}`;
      if (!isProfessor && filtroProfId) url += `&professoraId=${filtroProfId}`;
      const res = await fetch(url);
      const data = await res.json();
      setAulas(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [semana, isProfessor, filtroProfId]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Timeline do dia ────────────────────────────────────────────────────────
  function timelineDia(dia: Date) {
    const profId = isProfessor ? professoraIdSessao : (filtroProfId || null);
    if (!isProfessor && !profId) return [];
    const aulasD = aulas.filter((a) => isSameDay(parseLocal(a.data), dia))
      .sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? ""));
    if (!profId) return aulasD.map((a) => ({ tipo: "aula" as const, aula: a }));
    const disp = disponibilidades.find((d) => d.professoraId === profId);
    if (!disp || disp.slots.length === 0)
      return aulasD.map((a) => ({ tipo: "aula" as const, aula: a }));
    const nomeDia = DIAS_FULL[dia.getDay()];
    const janelas = disp.slots.filter((s) => s.dia === nomeDia)
      .map((s) => ({ inicio: toMin(s.inicio), fim: toMin(s.fim) }));
    if (janelas.length === 0) return aulasD.map((a) => ({ tipo: "aula" as const, aula: a }));
    const ativos  = aulas.filter((a) => isSameDay(parseLocal(a.data), dia) && a.status !== "CANCELADA" && a.horaInicio && a.horaFim);
    const livres  = subtrair(janelas, ativos.map((a) => ({ inicio: toMin(a.horaInicio!), fim: toMin(a.horaFim!) })));
    const chunks: { inicio: number; fim: number }[] = [];
    for (const l of livres) {
      let cur = l.inicio;
      while (cur + 60 <= l.fim) { chunks.push({ inicio: cur, fim: cur + 60 }); cur += 60; }
    }
    const items: ({ tipo: "aula"; aula: Aula; ini: number } | { tipo: "livre"; inicio: string; fim: string; ini: number })[] = [
      ...aulasD.map((a) => ({ tipo: "aula" as const, aula: a, ini: toMin(a.horaInicio ?? "00:00") })),
      ...chunks.map((c) => ({ tipo: "livre" as const, inicio: fromMin(c.inicio), fim: fromMin(c.fim), ini: c.inicio })),
    ];
    return items.sort((a, b) => a.ini - b.ini);
  }

  // ── Salvar nova aula ────────────────────────────────────────────────────────
  async function salvar() {
    if (!isProfessor && !profModal) { setErroModal("Selecione o(a) professor(a)."); return; }
    if (!novaAula.alunoId || !novaAula.data || !novaAula.horaInicio || !novaAula.horaFim) {
      setErroModal("Preencha aluno, data e horário."); return;
    }
    if (toMin(novaAula.horaFim) - toMin(novaAula.horaInicio) < 60) {
      setErroModal("Duração mínima de 1 hora."); return;
    }
    setSalvando(true); setErroModal(null);
    try {
      const res = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...novaAula, ...(!isProfessor ? { professoraId: profModal } : {}) }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErroModal(j.erro ?? "Erro ao salvar.");
        return;
      }
      setModalAberto(false);
      await carregar();
    } catch { setErroModal("Erro de comunicação."); }
    finally { setSalvando(false); }
  }

  // ── Atualizar status ────────────────────────────────────────────────────────
  async function atualizarStatus(id: string, status: StatusAula) {
    await fetch(`/api/agenda/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setAulas((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    setDetalhe((p) => p && p.id === id ? { ...p, status } : p);
  }

  // ── Marcar Realizada: exige registrar o conteúdo ministrado ─────────────────
  // Busca se já existe um conteúdo para este aluno/data — se existir, edita;
  // senão, abre formulário em branco. Só ao salvar é que a aula vira Realizada.
  async function abrirConteudoParaRealizada(aula: Aula) {
    setErroConteudo(null);
    setCarregandoConteudo(true);
    try {
      const dataStr = aula.data.split("T")[0];
      const res = await fetch(`/api/conteudos?alunoId=${aula.alunoId}&data=${dataStr}`);
      const existente = res.ok ? await res.json() : null;

      setConteudoModal({
        aulaId: aula.id,
        existente: !!existente,
        form: existente ? {
          id: existente.id,
          alunoId: existente.alunoId,
          materiaId: existente.materiaId,
          topico: existente.topico,
          descricao: existente.descricao ?? "",
          arquivoUrl: existente.arquivoUrl ?? "",
          arquivoNome: existente.arquivoUrl ? existente.arquivoUrl.split("/").pop() ?? "" : "",
          data: dataStr,
          planejadoOriginal: existente.planejado,
        } : {
          alunoId: aula.alunoId,
          materiaId: aula.materiaId,
          topico: "",
          descricao: "",
          arquivoUrl: "",
          arquivoNome: "",
          data: dataStr,
          planejadoOriginal: true,
        },
      });
      setDetalhe(null);
    } catch {
      setErroConteudo("Erro ao verificar conteúdo existente.");
    } finally {
      setCarregandoConteudo(false);
    }
  }

  async function salvarConteudoRealizada() {
    if (!conteudoModal) return;
    const { aulaId, existente, form } = conteudoModal;
    setSalvandoConteudo(true);
    setErroConteudo(null);
    try {
      if (existente && form.id) {
        const resPut = await fetch(`/api/conteudos/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, planejado: form.planejadoOriginal, arquivoUrl: form.arquivoUrl || null }),
        });
        if (!resPut.ok) {
          const d = await resPut.json();
          setErroConteudo(d.erro ?? "Erro ao salvar conteúdo.");
          return;
        }
        if (form.planejadoOriginal) {
          // ainda estava Planejado — marcar Ministrado já atualiza a agenda para Realizada
          const resMin = await fetch(`/api/conteudos/${form.id}/ministrado`, { method: "POST" });
          const dMin = await resMin.json();
          if (!resMin.ok) {
            setErroConteudo(dMin.erro ?? "Erro ao marcar como Ministrado.");
            return;
          }
        } else {
          // já estava Ministrado — só garante o status da agenda
          await fetch(`/api/agenda/${aulaId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "REALIZADA" }),
          });
        }
      } else {
        const resPost = await fetch("/api/conteudos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, aulaId, planejado: false, arquivoUrl: form.arquivoUrl || null }),
        });
        if (!resPost.ok) {
          const d = await resPost.json();
          setErroConteudo(d.erro ?? "Erro ao registrar conteúdo.");
          return;
        }
        const resPatch = await fetch(`/api/agenda/${aulaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "REALIZADA" }),
        });
        if (!resPatch.ok) {
          setErroConteudo("Conteúdo salvo, mas não foi possível atualizar a agenda.");
          return;
        }
      }

      setAulas((prev) => prev.map((a) => a.id === aulaId ? { ...a, status: "REALIZADA" } : a));
      setConteudoModal(null);
    } catch {
      setErroConteudo("Erro de comunicação com o servidor.");
    } finally {
      setSalvandoConteudo(false);
    }
  }

  async function uploadArquivoConteudo(file: File) {
    setEnviandoArquivo(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErroConteudo(data.erro ?? "Erro ao enviar arquivo.");
        return;
      }
      setConteudoModal((p) => p && { ...p, form: { ...p.form, arquivoUrl: data.url, arquivoNome: data.nome } });
    } catch {
      setErroConteudo("Erro ao enviar arquivo.");
    } finally {
      setEnviandoArquivo(false);
    }
  }

  const alunosFiltrados = !isProfessor && profModal
    ? alunos.filter((a) => a.professoraId === profModal)
    : alunos;

  const timeline = timelineDia(diaAtivo);
  const dsAtivo  = `${diaAtivo.getFullYear()}-${String(diaAtivo.getMonth()+1).padStart(2,"0")}-${String(diaAtivo.getDate()).padStart(2,"0")}`;

  return (
    <div className="flex flex-col h-dvh bg-slate-100 select-none overflow-hidden">

      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="bg-indigo-600 text-white px-4 pt-safe pb-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs opacity-75">EduGestão</p>
          <p className="text-sm font-bold leading-tight truncate max-w-[200px]">{nomeUsuario}</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw size={15} className="animate-spin opacity-75"/>}
          <button onClick={() => router.push("/api/auth/signout")} className="opacity-75 hover:opacity-100">
            <LogOut size={18}/>
          </button>
        </div>
      </div>

      {/* ── Filtro professor (admin) ──────────────────────────────────────── */}
      {isAdmin && professoras.length > 0 && (
        <div className="bg-white border-b border-slate-200 px-4 py-2 shrink-0">
          <select value={filtroProfId} onChange={(e) => setFiltroProfId(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {professoras.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      )}

      {/* ── Navegação de semana ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center justify-between shrink-0">
        <button onClick={() => setSemana((s) => addDays(s, -7))}
          className="p-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors">
          <ChevronLeft size={20} className="text-slate-600"/>
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {format(semana, "dd/MM", { locale: ptBR })} – {format(addDays(semana, 6), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <button onClick={() => setSemana((s) => addDays(s, 7))}
          className="p-2 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors">
          <ChevronRight size={20} className="text-slate-600"/>
        </button>
      </div>

      {/* ── Seletor de dia (scroll horizontal) ───────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-2 py-2 flex gap-1 overflow-x-auto no-scrollbar shrink-0">
        {diasSemana.map((dia, i) => {
          const ativo = isSameDay(dia, diaAtivo);
          const hoje  = isToday(dia);
          const qtd   = aulas.filter((a) => isSameDay(parseLocal(a.data), dia) && a.status !== "CANCELADA").length;
          return (
            <button key={i} onClick={() => setDiaAtivo(dia)}
              className={`flex flex-col items-center rounded-xl px-3 py-2 min-w-[46px] transition-colors ${
                ativo ? "bg-indigo-600 text-white" : hoje ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
              }`}>
              <span className="text-[10px] font-medium uppercase">{DIAS_PT[dia.getDay()]}</span>
              <span className="text-base font-bold leading-tight">{format(dia, "dd")}</span>
              {qtd > 0 && (
                <span className={`mt-0.5 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                  ativo ? "bg-white/30 text-white" : "bg-indigo-100 text-indigo-700"
                }`}>{qtd}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Lista do dia ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-24">
        {timeline.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-16">
            <p className="text-2xl mb-2">📅</p>
            <p>Nenhuma aula ou disponibilidade</p>
            <p className="text-xs mt-1">para {format(diaAtivo, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          </div>
        ) : timeline.map((item, j) =>
          item.tipo === "aula" ? (() => {
            const a   = item.aula;
            const cor = a.materia?.cor ?? "#6366f1";
            const cfg = STATUS_CFG[a.status];
            return (
              <button key={a.id} onClick={() => { setDetalhe(a); setErroConteudo(null); }}
                className="w-full text-left bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden active:scale-[0.98] transition-transform">
                <div className="flex items-stretch">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: cor }}/>
                  <div className="flex-1 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-800">{a.aluno.nome}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.cor}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </div>
                    {(a.horaInicio || a.horaFim) && (
                      <p className="text-sm text-slate-500 mt-0.5">{a.horaInicio}{a.horaFim ? ` – ${a.horaFim}` : ""}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(a.materia ? [a.materia] : a.aluno.materias?.map((m) => m.materia) ?? []).map((m) => (
                        <span key={m.id} className="text-[10px] text-white rounded-full px-2 py-0.5 font-medium"
                          style={{ backgroundColor: m.cor }}>{m.nome}</span>
                      ))}
                    </div>
                    {!isProfessor && (
                      <p className="text-[11px] text-slate-400 mt-1">Prof. {a.professora.usuario.nome}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })() : (
            <button key={`livre-${j}`}
              onClick={() => {
                setNovaAula({ alunoId: "", materiaId: "", data: dsAtivo, horaInicio: item.inicio, horaFim: item.fim, observacao: "" });
                setProfModal(filtroProfId);
                setErroModal(null);
                setModalAberto(true);
              }}
              className="w-full flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"/>
              <span className="text-sm text-emerald-700 font-medium">{item.inicio} – {item.fim} livre</span>
              <Plus size={14} className="text-emerald-500 ml-auto"/>
            </button>
          )
        )}
      </div>

      {/* ── Botão flutuante nova aula ──────────────────────────────────────── */}
      <button
        onClick={() => {
          setNovaAula({ alunoId: "", materiaId: "", data: dsAtivo, horaInicio: "", horaFim: "", observacao: "" });
          setProfModal(isAdmin ? filtroProfId : "");
          setErroModal(null);
          setModalAberto(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40">
        <Plus size={24}/>
      </button>

      {/* ── Modal nova aula ──────────────────────────────────────────────── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setModalAberto(false)}>
          <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Nova Aula</h2>
              <button onClick={() => setModalAberto(false)}><X size={20} className="text-slate-400"/></button>
            </div>

            {isAdmin && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Professor(a) *</label>
                <select value={profModal} onChange={(e) => { setProfModal(e.target.value); setNovaAula((p) => ({ ...p, alunoId: "", materiaId: "" })); }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white">
                  <option value="">Selecione...</option>
                  {professoras.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Aluno *</label>
              <select value={novaAula.alunoId}
                onChange={(e) => {
                  const al = alunosFiltrados.find((a) => a.id === e.target.value);
                  setNovaAula((p) => ({ ...p, alunoId: e.target.value, materiaId: al?.materias[0]?.id ?? "" }));
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white">
                <option value="">Selecione...</option>
                {alunosFiltrados.map((a) => <option key={a.id} value={a.id}>{a.nome} — {a.serie}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Data *</label>
              <input type="date" value={novaAula.data} onChange={(e) => setNovaAula((p) => ({ ...p, data: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm"/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Início *</label>
                <input type="time" value={novaAula.horaInicio} onChange={(e) => setNovaAula((p) => ({ ...p, horaInicio: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Fim *</label>
                <input type="time" value={novaAula.horaFim} onChange={(e) => setNovaAula((p) => ({ ...p, horaFim: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm"/>
              </div>
            </div>

            {erroModal && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroModal}</p>
            )}

            <button onClick={salvar} disabled={salvando}
              className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
              {salvando ? "Salvando..." : "Salvar aula"}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal detalhe da aula ─────────────────────────────────────────── */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setDetalhe(null)}>
          <div className="bg-white rounded-t-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">{detalhe.aluno.nome}</h2>
                <p className="text-sm text-slate-500">
                  {format(parseLocal(detalhe.data), "EEEE, dd/MM/yyyy", { locale: ptBR })}
                  {detalhe.horaInicio ? ` · ${detalhe.horaInicio}${detalhe.horaFim ? `–${detalhe.horaFim}` : ""}` : ""}
                </p>
              </div>
              <button onClick={() => setDetalhe(null)}><X size={20} className="text-slate-400"/></button>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Status</p>
              {(() => {
                const dataAula = parseLocal(detalhe.data);
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                const isFutura = dataAula > hoje;
                return (
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(STATUS_CFG) as StatusAula[]).map((s) => {
                      const bloqueado = isFutura && s !== "CANCELADA";
                      return (
                        <button key={s} disabled={bloqueado || carregandoConteudo}
                          onClick={() => s === "REALIZADA" ? abrirConteudoParaRealizada(detalhe) : atualizarStatus(detalhe.id, s)}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                            bloqueado ? "opacity-30 cursor-not-allowed bg-white border-slate-200 text-slate-400"
                            : detalhe.status === s
                              ? `${STATUS_CFG[s].bg} ${STATUS_CFG[s].cor} border-current`
                              : "bg-white border-slate-200 text-slate-500"
                          }`}>
                          {s === "REALIZADA" && carregandoConteudo ? <Loader2 size={13} className="animate-spin"/> : STATUS_CFG[s].icon} {STATUS_CFG[s].label}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {!conteudoModal && erroConteudo && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroConteudo}</p>
            )}

            <button onClick={() => setDetalhe(null)}
              className="w-full border border-slate-200 rounded-xl py-3 text-sm text-slate-600">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal conteúdo (ao marcar Realizada) ───────────────────────────── */}
      {conteudoModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setConteudoModal(null)}>
          <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                {conteudoModal.existente ? "Editar Conteúdo" : "Registrar Conteúdo"}
              </h2>
              <button onClick={() => setConteudoModal(null)}><X size={20} className="text-slate-400"/></button>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              Marcar a aula como Realizada exige registrar o conteúdo ministrado.
            </p>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Matéria</label>
              <select value={conteudoModal.form.materiaId ?? ""}
                onChange={(e) => setConteudoModal((p) => p && ({ ...p, form: { ...p.form, materiaId: e.target.value || null } }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white">
                <option value="">Todas as matérias</option>
                {(alunos.find((a) => a.id === conteudoModal.form.alunoId)?.materias ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Tópico *</label>
              <input value={conteudoModal.form.topico}
                onChange={(e) => setConteudoModal((p) => p && ({ ...p, form: { ...p.form, topico: e.target.value } }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm"/>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
              <textarea rows={3} value={conteudoModal.form.descricao}
                onChange={(e) => setConteudoModal((p) => p && ({ ...p, form: { ...p.form, descricao: e.target.value } }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm resize-none"/>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Anexo</label>
              {conteudoModal.form.arquivoUrl ? (
                <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2.5">
                  <span className="text-sm text-slate-600 truncate flex items-center gap-1.5">
                    <Paperclip size={14} className="shrink-0"/> {conteudoModal.form.arquivoNome || "arquivo"}
                  </span>
                  <button onClick={() => setConteudoModal((p) => p && ({ ...p, form: { ...p.form, arquivoUrl: "", arquivoNome: "" } }))}>
                    <X size={16} className="text-slate-400"/>
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-500 cursor-pointer">
                  {enviandoArquivo ? <Loader2 size={16} className="animate-spin"/> : <Paperclip size={16}/>}
                  {enviandoArquivo ? "Enviando..." : "Anexar arquivo"}
                  <input type="file" className="hidden" disabled={enviandoArquivo}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadArquivoConteudo(f); }}/>
                </label>
              )}
            </div>

            {erroConteudo && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroConteudo}</p>
            )}

            <button onClick={salvarConteudoRealizada} disabled={salvandoConteudo || !conteudoModal.form.topico}
              className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
              {salvandoConteudo ? "Salvando..." : "Salvar e marcar Realizada"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

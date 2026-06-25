"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, RefreshCw, X,
  CheckCircle2, XCircle, Clock, UserX, UserCheck,
  CalendarDays, List, Zap, Trash2,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Materia = { id: string; nome: string; cor: string };

type ConflitoDet = {
  alunoNome:          string;
  data:               string;
  horaInicio:         string;
  horaFim:            string;
  conflitoCom:        string;
  conflitoHoraInicio: string;
  conflitoHoraFim:    string;
};
type SemAgendaDet = {
  alunoNome: string;
  motivo:    string;
};

type AlunoOpt = {
  id: string; nome: string; serie: string; turma: string | null;
  diaSemana: number | null;
  professoraId: string | null;
  materias: Materia[];
};

type ProfessoraOpt = { id: string; nome: string };
type SlotDisp = { dia: string; inicio: string; fim: string };
type DispProfessora = { professoraId: string; slots: SlotDisp[] };

type Aula = {
  id: string;
  alunoId: string;
  materiaId: string | null;
  data: string;
  horaInicio: string | null;
  horaFim: string | null;
  status: StatusAula;
  observacao: string | null;
  aluno:      { id: string; nome: string; serie: string; turma: string | null; materias: { materia: Materia }[] };
  materia:    Materia | null;
  professora: { usuario: { nome: string } };
};

type StatusAula = "AGENDADA" | "REALIZADA" | "CANCELADA" | "FALTA_ALUNO" | "FALTA_PROFESSOR";

// ── Constantes ────────────────────────────────────────────────────────────────
const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

const STATUS_CONFIG: Record<StatusAula, { label: string; cor: string; bg: string; icon: React.ReactNode }> = {
  AGENDADA:         { label: "Agendada",          cor: "text-slate-600",   bg: "bg-slate-100",   icon: <Clock size={12}/> },
  REALIZADA:        { label: "Realizada",          cor: "text-emerald-700", bg: "bg-emerald-100", icon: <CheckCircle2 size={12}/> },
  CANCELADA:        { label: "Cancelada",          cor: "text-red-700",     bg: "bg-red-100",     icon: <XCircle size={12}/> },
  FALTA_ALUNO:      { label: "Falta do aluno",     cor: "text-amber-700",   bg: "bg-amber-100",   icon: <UserX size={12}/> },
  FALTA_PROFESSOR:  { label: "Falta do professor", cor: "text-orange-700",  bg: "bg-orange-100",  icon: <UserCheck size={12}/> },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseLocal(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

function semanaInicio(ref: Date) {
  // Segunda como início da semana
  return startOfWeek(ref, { weekStartsOn: 1 });
}

function corAluno(id: string) {
  // Gera uma cor consistente por ID (rotação de palette)
  const palette = [
    "#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444",
    "#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

// ── Helpers de disponibilidade ────────────────────────────────────────────────
function toMin(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}
function fromMin(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
// Subtrai intervalos ocupados de uma lista de janelas livres
function subtrairOcupados(
  janelas: { inicio: number; fim: number }[],
  ocupados: { inicio: number; fim: number }[],
): { inicio: number; fim: number }[] {
  let livres = [...janelas];
  for (const oc of ocupados) {
    livres = livres.flatMap((j) => {
      if (oc.fim <= j.inicio || oc.inicio >= j.fim) return [j];
      const antes = oc.inicio > j.inicio ? [{ inicio: j.inicio, fim: oc.inicio }] : [];
      const depois = oc.fim < j.fim ? [{ inicio: oc.fim, fim: j.fim }] : [];
      return [...antes, ...depois];
    });
  }
  return livres.filter((j) => j.fim - j.inicio >= 30); // ignora < 30 min
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AgendaClient({
  alunos, materias, professoras = [], isProfessor = true,
  disponibilidades = [], professoraIdSessao = "",
}: {
  alunos: AlunoOpt[];
  materias: Materia[];
  professoras?: ProfessoraOpt[];
  disponibilidades?: DispProfessora[];
  professoraIdSessao?: string;
  isProfessor?: boolean;
}) {
  const router = useRouter();
  const [vista, setVista]         = useState<"semana" | "dia">("semana");
  const [semanaRef, setSemanaRef] = useState(() => semanaInicio(new Date()));
  const [diaRef, setDiaRef]       = useState(new Date());
  const [aulas, setAulas]         = useState<Aula[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Modal nova aula
  const [modalAberto, setModalAberto]         = useState(false);
  const [dataModal, setDataModal]             = useState("");
  const [professoraIdModal, setProfessoraIdModal] = useState("");
  const [novaAula, setNovaAula]               = useState({
    alunoId: "", materiaId: "", data: "", horaInicio: "", horaFim: "", observacao: "",
  });
  const [salvando, setSalvando]   = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [avisoAgendamento, setAvisoAgendamento] = useState<string | null>(null); // aviso de regra não satisfeita

  // Alunos filtrados pela professora selecionada no modal (só para não-professores)
  const alunosFiltradosModal = !isProfessor && professoraIdModal
    ? alunos.filter((a) => a.professoraId === professoraIdModal)
    : alunos;

  // Modal detalhes / edição
  const [aulaDetalhe, setAulaDetalhe] = useState<Aula | null>(null);
  const [obsEdit, setObsEdit]         = useState("");
  const [materiaDetalheId, setMateriaDetalheId] = useState<string>("");
  const [atualizando, setAtualizando] = useState(false);
  const [erroStatus, setErroStatus]   = useState<string | null>(null);
  const obsRef = useRef<HTMLTextAreaElement>(null);

  // Filtro de professora (admin)
  const [filtroProfId, setFiltroProfId] = useState("");
  // Filtro de matéria (todos os perfis)
  const [filtroMateriaId, setFiltroMateriaId] = useState("");

  // Gerar semana
  const [gerando, setGerando]             = useState(false);
  const [msgGerar, setMsgGerar]           = useState<string | null>(null);
  const [conflitosModal,  setConflitosModal]  = useState<ConflitoDet[]>([]);
  const [semAgendaModal,  setSemAgendaModal]  = useState<SemAgendaDet[]>([]);
  // Modal seleção de professor para admin gerar agenda
  const [modalGerarAberto, setModalGerarAberto] = useState(false);
  const [gerarProfId, setGerarProfId]           = useState("");

  // Excluir em lote
  const [modalLimpar, setModalLimpar]   = useState(false);
  const [limparProfId, setLimparProfId] = useState("");
  const [limparAlunoId, setLimparAlunoId] = useState("");
  const [limparInicio, setLimparInicio] = useState("");
  const [limparFim, setLimparFim]       = useState("");
  const [excluindo, setExcluindo]       = useState(false);
  const [msgLimpar, setMsgLimpar]       = useState<string | null>(null);

  // Alunos disponíveis no modal de limpeza (filtra por prof se não-professor)
  const alunosFiltradosLimpar = !isProfessor && limparProfId
    ? alunos.filter((a) => a.professoraId === limparProfId)
    : alunos;

  // ── Carrega aulas ──────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      let inicio: Date, fim: Date;
      if (vista === "semana") {
        inicio = semanaRef;
        fim    = addDays(semanaRef, 6);
      } else {
        inicio = diaRef;
        fim    = diaRef;
      }
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      let url = `/api/agenda?inicio=${fmt(inicio)}&fim=${fmt(fim)}`;
      if (!isProfessor && filtroProfId) url += `&professoraId=${filtroProfId}`;
      const res  = await fetch(url);
      const data = await res.json();
      setAulas(Array.isArray(data) ? data : []);
    } finally {
      setCarregando(false);
    }
  }, [vista, semanaRef, diaRef, isProfessor, filtroProfId]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Navegação ──────────────────────────────────────────────────────────────
  function navAnterior() {
    if (vista === "semana") setSemanaRef((s) => addDays(s, -7));
    else setDiaRef((d) => addDays(d, -1));
  }
  function navProximo() {
    if (vista === "semana") setSemanaRef((s) => addDays(s, 7));
    else setDiaRef((d) => addDays(d, 1));
  }
  function irHoje() {
    const hoje = new Date();
    setSemanaRef(semanaInicio(hoje));
    setDiaRef(hoje);
  }

  // ── Gerar semana ───────────────────────────────────────────────────────────
  function abrirModalGerar() {
    if (!isProfessor) {
      setGerarProfId("");
      setModalGerarAberto(true);
    } else {
      gerarSemana(null);
    }
  }

  async function gerarSemana(profId: string | null) {
    setModalGerarAberto(false);
    setGerando(true); setMsgGerar(null);
    try {
      // Usa data local (não UTC) para evitar shift de fuso horário
      const fmtLocal = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const body: Record<string, string> = { semanaInicio: fmtLocal(semanaRef) };
      if (profId) body.professoraId = profId;
      const res  = await fetch("/api/agenda/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgGerar(`Erro: ${data.erro ?? "Falha ao gerar agenda."}`);
        return;
      }
      const nConflitos  = Array.isArray(data.conflitos)  ? data.conflitos.length  : 0;
      const nSemAgenda  = Array.isArray(data.semAgenda)  ? data.semAgenda.length  : 0;

      if (data.criadas === 0 && data.ignoradas === 0 && nConflitos === 0 && nSemAgenda === 0) {
        setMsgGerar("Nenhum aluno com parâmetros de agenda configurados.");
      } else {
        const partes: string[] = [];
        if (data.criadas   > 0) partes.push(`${data.criadas} aula(s) gerada(s) até 31/12`);
        if (data.ignoradas > 0) partes.push(`${data.ignoradas} já existiam`);
        if (nConflitos     > 0) partes.push(`${nConflitos} conflito(s) de horário`);
        if (nSemAgenda     > 0) partes.push(`${nSemAgenda} aluno(s) sem agenda no cadastro`);
        setMsgGerar(partes.join(" · ") + ".");
      }

      // Abre a tela de resultados se houver conflitos ou alunos sem agenda
      if (nConflitos > 0 || nSemAgenda > 0) {
        setConflitosModal(data.conflitos as ConflitoDet[]);
        setSemAgendaModal(data.semAgenda as SemAgendaDet[]);
      }
      await carregar();
    } catch {
      setMsgGerar("Erro de comunicação com o servidor.");
    } finally {
      setGerando(false);
      setTimeout(() => setMsgGerar(null), 5000);
    }
  }

  // ── Excluir em lote ───────────────────────────────────────────────────────
  function abrirModalLimpar() {
    setLimparProfId("");
    setLimparAlunoId("");
    setLimparInicio("");
    setLimparFim("");
    setMsgLimpar(null);
    setModalLimpar(true);
  }

  async function excluirPeriodo() {
    if (!limparAlunoId) return;
    if (!confirm("Excluir as aulas do aluno no período selecionado? Esta ação não pode ser desfeita.")) return;
    setExcluindo(true);
    try {
      const body: Record<string, string> = { alunoId: limparAlunoId };
      if (limparInicio)  body.inicio      = limparInicio;
      if (limparFim)     body.fim         = limparFim;
      if (!isProfessor && limparProfId) body.professoraId = limparProfId;
      const res  = await fetch("/api/agenda", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgLimpar(`Erro: ${data.erro ?? "Falha ao excluir."}`);
        return;
      }
      setMsgLimpar(`${data.excluidas} aula(s) excluída(s).`);
      setModalLimpar(false);
      await carregar();
    } catch {
      setMsgLimpar("Erro de comunicação com o servidor.");
    } finally {
      setExcluindo(false);
      setTimeout(() => setMsgLimpar(null), 5000);
    }
  }

  // ── Nova aula ──────────────────────────────────────────────────────────────
  function abrirModal(data?: string) {
    setDataModal(data ?? "");
    setProfessoraIdModal("");
    setErroModal(null);
    setAvisoAgendamento(null);
    setNovaAula({ alunoId: "", materiaId: "", data: data ?? "", horaInicio: "", horaFim: "", observacao: "" });
    setModalAberto(true);
  }

  /** Verifica se a data/hora da nova aula viola a regra de geração automática.
   *  Retorna uma string de aviso se houver problema, ou null se estiver ok. */
  function verificarRegraAgendamento(): string | null {
    if (!novaAula.data) return null;
    const agora = new Date();
    const horaAgora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    const [y, m, d] = novaAula.data.split("-").map(Number);
    const dataAula = new Date(y, m - 1, d);

    if (dataAula < hoje) {
      return `A data selecionada (${novaAula.data.split("-").reverse().join("/")}) é anterior a hoje. Deseja incluir mesmo assim?`;
    }
    if (dataAula.getTime() === hoje.getTime() && novaAula.horaInicio && novaAula.horaInicio <= horaAgora) {
      return `O horário ${novaAula.horaInicio} de hoje já passou (agora são ${horaAgora}). Deseja incluir mesmo assim?`;
    }
    return null;
  }

  async function salvarNovaAula(forcar = false) {
    if (!novaAula.alunoId || !novaAula.data) return;
    if (!isProfessor && !professoraIdModal) return;

    // Verifica regra de agendamento — pede confirmação se não satisfeita
    if (!forcar) {
      const aviso = verificarRegraAgendamento();
      if (aviso) {
        setAvisoAgendamento(aviso);
        return; // aguarda confirmação do usuário
      }
    }

    setAvisoAgendamento(null);
    setSalvando(true);
    setErroModal(null);
    try {
      const res = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...novaAula,
          ...(!isProfessor ? { professoraId: professoraIdModal } : {}),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErroModal(json.erro ?? "Erro ao salvar aula.");
        return;
      }
      setModalAberto(false);
      await carregar();
    } catch {
      setErroModal("Erro de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  }

  // Ao selecionar professora, limpa aluno/matéria
  function onSelectProfessora(id: string) {
    setProfessoraIdModal(id);
    setNovaAula((p) => ({ ...p, alunoId: "", materiaId: "" }));
  }

  // Ao selecionar aluno, pré-preenche matéria
  function onSelectAluno(alunoId: string) {
    const aluno = alunosFiltradosModal.find((a) => a.id === alunoId);
    const materiaId = aluno?.materias[0]?.id ?? "";
    setNovaAula((p) => ({ ...p, alunoId, materiaId }));
  }

  // ── Atualizar status ───────────────────────────────────────────────────────
  async function atualizarStatus(id: string, status: StatusAula) {
    // Aulas futuras só permitem CANCELADA; demais status exigem a data já passada
    if (aulaDetalhe && status !== "CANCELADA") {
      const dataAula = parseLocal(aulaDetalhe.data);
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      if (dataAula > hoje) {
        setErroStatus("Não é possível alterar o status de uma aula futura (exceto Cancelar).");
        return;
      }
    }
    // "Realizada" → abre tela de Conteúdos pré-preenchida com dados da aula
    if (status === "REALIZADA" && aulaDetalhe) {
      const params = new URLSearchParams({
        aulaId:    aulaDetalhe.id,
        alunoId:   aulaDetalhe.aluno.id,
        materiaId: materiaDetalheId,
        data:      aulaDetalhe.data.split("T")[0],
      });
      router.push(`/dashboard/conteudos?${params.toString()}`);
      return;
    }
    setErroStatus(null);
    setAtualizando(true);
    try {
      const res = await fetch(`/api/agenda/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErroStatus(data.erro ?? "Não foi possível alterar o status.");
        return;
      }
      setAulas((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      if (aulaDetalhe?.id === id) setAulaDetalhe((p) => p ? { ...p, status } : p);
    } finally {
      setAtualizando(false);
    }
  }

  async function salvarMateria(materiaId: string) {
    if (!aulaDetalhe) return;
    await fetch(`/api/agenda/${aulaDetalhe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materiaId: materiaId || null }),
    });
    const materia = materiaId
      ? (aulaDetalhe.aluno.materias.find((m) => m.materia.id === materiaId)?.materia ?? null)
      : null;
    setAulas((prev) => prev.map((a) => a.id === aulaDetalhe.id ? { ...a, materia, materiaId: materiaId || null } : a));
    setAulaDetalhe((p) => p ? { ...p, materia, materiaId: materiaId || null } : p);
  }

  async function salvarObservacao() {
    if (!aulaDetalhe) return;
    setAtualizando(true);
    try {
      await fetch(`/api/agenda/${aulaDetalhe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacao: obsEdit }),
      });
      setAulas((prev) => prev.map((a) => a.id === aulaDetalhe.id ? { ...a, observacao: obsEdit } : a));
      setAulaDetalhe((p) => p ? { ...p, observacao: obsEdit } : p);
    } finally {
      setAtualizando(false);
    }
  }

  async function excluirAula(id: string) {
    if (!confirm("Excluir esta aula?")) return;
    const res = await fetch(`/api/agenda/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroStatus(data.erro ?? "Erro ao excluir a aula.");
      return;
    }
    setAulas((prev) => prev.filter((a) => a.id !== id));
    setAulaDetalhe(null);
  }

  // ── Dados calculados ───────────────────────────────────────────────────────
  const diasGrade = Array.from({ length: 7 }, (_, i) => addDays(semanaRef, i));

  // Matérias únicas derivadas dos alunos (garante que o filtro aparece mesmo
  // quando a prop `materias` vem vazia por falta de vínculo professora-matéria)
  const materiasDisponiveis: Materia[] = (() => {
    const map = new Map<string, Materia>();
    for (const m of materias) map.set(m.id, m);
    for (const a of alunos) for (const m of a.materias) if (!map.has(m.id)) map.set(m.id, m);
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  })();

  // Aulas filtradas pela matéria selecionada — usa o materiaId da própria aula
  const aulasFiltradas = filtroMateriaId
    ? aulas.filter((a) => a.materiaId === filtroMateriaId)
    : aulas;

  function aulasNoDia(dia: Date) {
    return aulasFiltradas.filter((a) => isSameDay(parseLocal(a.data), dia))
      .sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? ""));
  }

  // Slots livres por dia para o professor ativo (sessão ou filtro admin)
  function slotLivresDia(dia: Date): { inicio: string; fim: string }[] {
    const profId = isProfessor ? professoraIdSessao : (filtroProfId || null);
    if (!profId) return [];
    const disp = disponibilidades.find((d) => d.professoraId === profId);
    if (!disp || disp.slots.length === 0) return [];
    const nomeDia = DIAS_SEMANA_FULL[dia.getDay()];
    const janelas = disp.slots
      .filter((s) => s.dia === nomeDia)
      .map((s) => ({ inicio: toMin(s.inicio), fim: toMin(s.fim) }));
    if (janelas.length === 0) return [];
    // Aulas do dia do professor filtrado (não canceladas)
    const aulasAtivas = aulas.filter(
      (a) => isSameDay(parseLocal(a.data), dia) &&
             a.status !== "CANCELADA" &&
             a.horaInicio && a.horaFim,
    );
    const ocupados = aulasAtivas.map((a) => ({
      inicio: toMin(a.horaInicio!),
      fim:    toMin(a.horaFim!),
    }));
    return subtrairOcupados(janelas, ocupados).map((j) => ({
      inicio: fromMin(j.inicio),
      fim:    fromMin(j.fim),
    }));
  }

  const aulasHoje = aulasNoDia(diaRef);
  const totalDia  = aulasHoje.length;
  const realizadas = aulasHoje.filter((a) => a.status === "REALIZADA").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Barra de controles ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        {/* Vista */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setVista("semana")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${vista === "semana" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
            <CalendarDays size={13}/> Semana
          </button>
          <button onClick={() => setVista("dia")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${vista === "dia" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>
            <List size={13}/> Dia
          </button>
        </div>

        {/* Navegação */}
        <div className="flex items-center gap-2">
          <button onClick={navAnterior} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronLeft size={16}/>
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[160px] text-center">
            {vista === "semana"
              ? `${format(semanaRef, "dd/MM", { locale: ptBR })} – ${format(addDays(semanaRef, 6), "dd/MM/yyyy", { locale: ptBR })}`
              : format(diaRef, "EEEE, dd/MM/yyyy", { locale: ptBR })
            }
          </span>
          <button onClick={navProximo} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronRight size={16}/>
          </button>
          <button onClick={irHoje} className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Hoje
          </button>
        </div>

        <div className="flex-1" />

        {/* Filtro por professora (apenas admin) */}
        {!isProfessor && professoras.length > 0 && (
          <select
            value={filtroProfId}
            onChange={(e) => setFiltroProfId(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
          >
            <option value="">Todos os professores</option>
            {professoras.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        )}

        {/* Filtro por matéria */}
        {materiasDisponiveis.length > 0 && (
          <select
            value={filtroMateriaId}
            onChange={(e) => setFiltroMateriaId(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
          >
            <option value="">Todas as matérias</option>
            {materiasDisponiveis.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        )}

        {/* Ações */}
        {vista === "semana" && (
          <button onClick={abrirModalGerar} disabled={gerando}
            title="Gera todas as aulas recorrentes a partir de hoje até 31/12"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50">
            {gerando ? <RefreshCw size={13} className="animate-spin"/> : <Zap size={13}/>}
            {gerando ? "Gerando..." : "Gerar agenda"}
          </button>
        )}
        <button onClick={abrirModalLimpar}
          title="Excluir aulas em lote por aluno e período"
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
          <Trash2 size={13}/> Excluir período
        </button>
        <button onClick={() => abrirModal(vista === "dia" ? diaRef.toISOString().split("T")[0] : "")}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          <Plus size={13}/> Nova aula
        </button>
        <button onClick={carregar} disabled={carregando}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={carregando ? "animate-spin text-indigo-500" : "text-slate-500"}/>
        </button>
      </div>

      {/* Feedback gerar */}
      {msgGerar && (
        <div className={`text-sm font-medium px-4 py-2.5 rounded-xl border ${
          msgGerar.includes("Erro")
            ? "bg-red-50 border-red-200 text-red-800"
            : msgGerar.includes("conflito") || msgGerar.includes("Nenhum")
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          {msgGerar}
        </div>
      )}

      {/* Feedback exclusão em lote */}
      {msgLimpar && (
        <div className={`text-sm font-medium px-4 py-2.5 rounded-xl border ${
          msgLimpar.startsWith("Erro")
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          {msgLimpar}
        </div>
      )}

      {/* ── Vista Semana ───────────────────────────────────────────────────── */}
      {vista === "semana" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {diasGrade.map((dia, i) => {
              const hoje = isToday(dia);
              return (
                <div key={i} className={`py-3 px-2 text-center border-r last:border-r-0 border-slate-100 ${hoje ? "bg-indigo-50" : ""}`}>
                  <p className={`text-xs font-semibold ${hoje ? "text-indigo-600" : "text-slate-500"}`}>{DIAS_PT[dia.getDay()]}</p>
                  <p className={`text-lg font-bold mt-0.5 leading-none ${hoje ? "text-indigo-700" : "text-slate-800"}`}>
                    {format(dia, "dd")}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[320px]">
            {diasGrade.map((dia, i) => {
              const lista  = aulasNoDia(dia);
              const hoje   = isToday(dia);
              const livres = slotLivresDia(dia);
              return (
                <div key={i}
                  className={`border-r last:border-r-0 border-slate-100 p-2 space-y-1.5 align-top ${hoje ? "bg-indigo-50/40" : ""}`}>
                  {lista.map((aula) => <CardAula key={aula.id} aula={aula} mostrarProfessora={!isProfessor} filtroMateriaId={filtroMateriaId} onClick={() => {
                    setAulaDetalhe(aula); setObsEdit(aula.observacao ?? ""); setMateriaDetalheId(aula.materia?.id ?? ""); setErroStatus(null);
                    if (aula.status === "REALIZADA" && !aula.observacao) setTimeout(() => obsRef.current?.focus(), 100);
                  }}/>)}
                  {livres.map((s, j) => (
                    <div key={j}
                      className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors"
                      title={`Horário livre: ${s.inicio} – ${s.fim}`}
                      onClick={() => {
                        const ds = `${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,"0")}-${String(dia.getDate()).padStart(2,"0")}`;
                        abrirModal(ds);
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"/>
                      <span className="text-[10px] text-emerald-700 font-medium leading-none">
                        {s.inicio} – {s.fim}
                      </span>
                    </div>
                  ))}
                  <button onClick={() => {
                    const d = dia;
                    const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                    abrirModal(s);
                  }}
                    className="w-full text-left text-xs text-slate-400 hover:text-indigo-500 px-1 py-0.5 rounded transition-colors">
                    + aula
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Vista Dia ──────────────────────────────────────────────────────── */}
      {vista === "dia" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Resumo */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">
              {format(diaRef, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
            <span className="text-xs text-slate-400">
              {totalDia} aula(s) · {realizadas} realizada(s)
            </span>
          </div>
          {aulasHoje.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Nenhuma aula agendada para este dia.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {aulasHoje.map((aula) => {
                const cor = aula.materia?.cor ?? corAluno(aula.alunoId);
                return (
                  <div key={aula.id}
                    className="flex items-stretch gap-0 hover:brightness-[0.97] transition-all cursor-default"
                    style={{ backgroundColor: cor + "18" }}>
                    {/* Barra lateral grossa */}
                    <div className="w-[5px] shrink-0 rounded-l-sm" style={{ backgroundColor: cor }}/>
                    {/* Hora */}
                    <div className="w-16 shrink-0 flex flex-col items-center justify-center py-4 px-2">
                      {aula.horaInicio
                        ? <>
                            <p className="text-sm font-bold" style={{ color: cor }}>{aula.horaInicio}</p>
                            {aula.horaFim && <p className="text-[11px] text-slate-400">{aula.horaFim}</p>}
                          </>
                        : <p className="text-xs text-slate-400">–</p>
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 py-4 pr-2">
                      <p className="text-sm font-bold text-slate-800">{aula.aluno.nome}</p>
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: cor }}>
                        {aula.materia?.nome ?? "Sem matéria"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {aula.aluno.serie}{aula.aluno.turma ? ` · ${aula.aluno.turma}` : ""}
                      </p>
                      {!isProfessor && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Prof. {aula.professora.usuario.nome}
                        </p>
                      )}
                      {aula.observacao && (
                        <p className="text-xs text-slate-500 mt-1 italic">"{aula.observacao}"</p>
                      )}
                    </div>
                    {/* Status + editar */}
                    <div className="flex items-center gap-2 shrink-0 pr-5 py-4">
                      <BadgeStatus status={aula.status}/>
                      <button onClick={() => {
                        setAulaDetalhe(aula); setObsEdit(aula.observacao ?? ""); setMateriaDetalheId(aula.materia?.id ?? ""); setErroStatus(null);
                        if (aula.status === "REALIZADA" && !aula.observacao) setTimeout(() => obsRef.current?.focus(), 100);
                      }}
                        className="text-xs text-slate-400 hover:text-indigo-600 transition-colors underline">
                        editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Nova Aula ────────────────────────────────────────────────── */}
      {modalAberto && (
        <Modal titulo="Nova aula" onClose={() => setModalAberto(false)}>
          <div className="space-y-3">

            {/* Seletor de professora (apenas para não-professores) */}
            {!isProfessor && (
              <div>
                <label className="text-xs font-medium text-slate-600">Professora *</label>
                <select value={professoraIdModal} onChange={(e) => onSelectProfessora(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Selecionar professora...</option>
                  {professoras.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600">Aluno *</label>
              <select value={novaAula.alunoId} onChange={(e) => onSelectAluno(e.target.value)}
                disabled={!isProfessor && !professoraIdModal}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">
                  {!isProfessor && !professoraIdModal ? "Selecione a professora primeiro" : "Selecionar aluno..."}
                </option>
                {alunosFiltradosModal.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome} — {a.serie}{a.turma ? ` (${a.turma})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Matéria</label>
              <select value={novaAula.materiaId} onChange={(e) => setNovaAula((p) => ({ ...p, materiaId: e.target.value }))}
                disabled={!novaAula.alunoId}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">Todas as matérias</option>
                {(alunosFiltradosModal.find((a) => a.id === novaAula.alunoId)?.materias ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Data *</label>
              <input type="date" value={novaAula.data} onChange={(e) => { setAvisoAgendamento(null); setNovaAula((p) => ({ ...p, data: e.target.value })); }}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Início</label>
                <input type="time" value={novaAula.horaInicio} onChange={(e) => { setAvisoAgendamento(null); setNovaAula((p) => ({ ...p, horaInicio: e.target.value })); }}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Fim</label>
                <input type="time" value={novaAula.horaFim} onChange={(e) => setNovaAula((p) => ({ ...p, horaFim: e.target.value }))}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Observação</label>
              <input value={novaAula.observacao} onChange={(e) => setNovaAula((p) => ({ ...p, observacao: e.target.value }))}
                placeholder="Opcional..."
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            {/* Erro de conflito ou outro */}
            {erroModal && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                ⚠️ {erroModal}
              </div>
            )}

            {/* Aviso de regra de agendamento — pede confirmação */}
            {avisoAgendamento && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-3 text-xs text-amber-800 space-y-2">
                <p>⚠️ <strong>Atenção:</strong> {avisoAgendamento}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => salvarNovaAula(true)}
                    disabled={salvando}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50">
                    {salvando && <RefreshCw size={11} className="animate-spin"/>}
                    Sim, incluir mesmo assim
                  </button>
                  <button
                    onClick={() => setAvisoAgendamento(null)}
                    className="px-3 py-1.5 text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors">
                    Não, cancelar
                  </button>
                </div>
              </div>
            )}

            {!avisoAgendamento && (
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={() => salvarNovaAula()} disabled={salvando || !novaAula.alunoId || !novaAula.data || (!isProfessor && !professoraIdModal)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                {salvando && <RefreshCw size={13} className="animate-spin"/>}
                Salvar
              </button>
            </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal Gerar Agenda (seleção de professor para admin) ─────────── */}
      {modalGerarAberto && (
        <Modal titulo="Gerar agenda" onClose={() => setModalGerarAberto(false)}>
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Selecione o(a) professor(a) para gerar as aulas recorrentes até 31/12.
              Deixe em branco para gerar para <strong>todos os professores</strong>.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600">Professor(a)</label>
              <select
                value={gerarProfId}
                onChange={(e) => setGerarProfId(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos os professores</option>
                {professoras.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setModalGerarAberto(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => gerarSemana(gerarProfId || null)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <Zap size={13}/> Gerar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Tela de Conflitos ─────────────────────────────────────────────── */}
      {(conflitosModal.length > 0 || semAgendaModal.length > 0) && (
        <TelaConflitos
          conflitos={conflitosModal}
          semAgenda={semAgendaModal}
          onFechar={() => { setConflitosModal([]); setSemAgendaModal([]); }}
        />
      )}

      {/* ── Modal Excluir em Lote ─────────────────────────────────────────── */}
      {modalLimpar && (
        <Modal titulo="Excluir aulas em lote" onClose={() => setModalLimpar(false)}>
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Selecione o aluno e o período. Se não informar datas, <strong>todas</strong> as aulas do aluno serão excluídas.
            </p>

            {/* Professora (apenas para não-professores) */}
            {!isProfessor && (
              <div>
                <label className="text-xs font-medium text-slate-600">Professora</label>
                <select value={limparProfId}
                  onChange={(e) => { setLimparProfId(e.target.value); setLimparAlunoId(""); }}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="">Todas as professoras</option>
                  {professoras.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Aluno */}
            <div>
              <label className="text-xs font-medium text-slate-600">Aluno *</label>
              <select value={limparAlunoId} onChange={(e) => setLimparAlunoId(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="">Selecionar aluno...</option>
                {alunosFiltradosLimpar.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome} — {a.serie}{a.turma ? ` (${a.turma})` : ""}</option>
                ))}
              </select>
            </div>

            {/* Período */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Data início</label>
                <input type="date" value={limparInicio} onChange={(e) => setLimparInicio(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Data fim</label>
                <input type="date" value={limparFim} onChange={(e) => setLimparFim(e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
              </div>
            </div>

            {/* Aviso de impacto */}
            {limparAlunoId && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                ⚠️ Esta ação <strong>não pode ser desfeita</strong>.
                {!limparInicio && !limparFim
                  ? " Todas as aulas do aluno serão excluídas."
                  : ` Aulas do aluno${limparInicio ? ` a partir de ${limparInicio}` : ""}${limparFim ? ` até ${limparFim}` : ""} serão excluídas.`
                }
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setModalLimpar(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={excluirPeriodo}
                disabled={excluindo || !limparAlunoId}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                {excluindo ? <RefreshCw size={13} className="animate-spin"/> : <Trash2 size={13}/>}
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Detalhe / Edição ─────────────────────────────────────────── */}
      {aulaDetalhe && (
        <Modal
          titulo={aulaDetalhe.aluno.nome}
          onClose={() => setAulaDetalhe(null)}
        >
          <div className="space-y-4">
            {/* Info */}
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-slate-400 text-xs">Data:</span> <span className="font-medium">{format(parseLocal(aulaDetalhe.data), "EEEE, dd/MM/yyyy", { locale: ptBR })}</span></p>
              <p><span className="text-slate-400 text-xs">Horário:</span> <span className="font-medium">{aulaDetalhe.horaInicio ?? "–"}{aulaDetalhe.horaFim ? ` → ${aulaDetalhe.horaFim}` : ""}</span></p>
              <p><span className="text-slate-400 text-xs">Série:</span> <span className="font-medium">{aulaDetalhe.aluno.serie}{aulaDetalhe.aluno.turma ? ` · ${aulaDetalhe.aluno.turma}` : ""}</span></p>
              {!isProfessor && (
                <p><span className="text-slate-400 text-xs">Professor(a):</span> <span className="font-medium">{aulaDetalhe.professora.usuario.nome}</span></p>
              )}
            </div>

            {/* Matéria da aula */}
            {(aulaDetalhe.aluno.materias?.length ?? 0) > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Matéria da aula</label>
                <select
                  value={materiaDetalheId}
                  onChange={(e) => { setMateriaDetalheId(e.target.value); salvarMateria(e.target.value); }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Todas as matérias</option>
                  {aulaDetalhe.aluno.materias.map((m) => (
                    <option key={m.materia.id} value={m.materia.id}>{m.materia.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status rápido */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Status</p>
              {(() => {
                const dataAula = parseLocal(aulaDetalhe.data);
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                const isFutura = dataAula > hoje;
                return (
                  <>
                    {isFutura && (
                      <p className="mb-2 text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                        🔒 Aula futura: somente <strong>Cancelar</strong> está disponível antes da data da aula.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(STATUS_CONFIG) as StatusAula[]).map((s) => {
                        const bloqueado = atualizando || (isFutura && s !== "CANCELADA");
                        return (
                        <button key={s} disabled={bloqueado}
                          onClick={() => atualizarStatus(aulaDetalhe.id, s)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            bloqueado ? "opacity-40 cursor-not-allowed bg-white border-slate-200 text-slate-400"
                            : aulaDetalhe.status === s
                              ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].cor} border-current`
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}>
                          {STATUS_CONFIG[s].icon}
                          {STATUS_CONFIG[s].label}
                        </button>
                        );
                      })}
                    </div>
                    {erroStatus && (
                      <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        ⚠️ {erroStatus}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Observação */}
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">
                Observação / conteúdo da aula
                {erroStatus && <span className="ml-1 text-amber-600">*</span>}
              </label>
              <textarea
                ref={obsRef}
                value={obsEdit}
                onChange={(e) => { setObsEdit(e.target.value); if (e.target.value.trim()) setErroStatus(null); }}
                rows={3}
                placeholder="O que foi trabalhado na aula..."
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${
                  erroStatus
                    ? "border-amber-400 focus:ring-amber-400 bg-amber-50"
                    : "border-slate-200 focus:ring-indigo-500"
                }`}
              />
              <button onClick={salvarObservacao} disabled={atualizando || obsEdit === (aulaDetalhe.observacao ?? "")}
                className="mt-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors">
                Salvar observação
              </button>
            </div>

            {/* Rodapé */}
            <div className="flex justify-between pt-1 flex-wrap gap-2">
              <button onClick={() => excluirAula(aulaDetalhe.id)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
                <Trash2 size={13}/> Excluir aula
              </button>
              <button onClick={() => setAulaDetalhe(null)}
                className="px-4 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

// Cores hex por status — usadas no estilo inline do card
const STATUS_COR: Record<StatusAula, { bg: string; border: string; text: string }> = {
  AGENDADA:        { bg: "#f1f5f9", border: "#94a3b8", text: "#475569" },
  REALIZADA:       { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  CANCELADA:       { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  FALTA_ALUNO:     { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  FALTA_PROFESSOR: { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
};

function CardAula({ aula, onClick, mostrarProfessora = false, filtroMateriaId = "" }: {
  aula: Aula; onClick: () => void; mostrarProfessora?: boolean; filtroMateriaId?: string;
}) {
  const cfg    = STATUS_CONFIG[aula.status];
  const cores  = STATUS_COR[aula.status];
  const materiasCard = aula.materia
    ? [aula.materia]
    : (aula.aluno.materias?.map((m) => m.materia) ?? []);
  const todasMaterias = materiasCard.filter((m) => !filtroMateriaId || m.id === filtroMateriaId);
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-lg px-2.5 py-2 border-l-[4px] transition-all hover:brightness-95 hover:shadow-sm"
      style={{ backgroundColor: cores.bg, borderLeftColor: cores.border }}>
      {/* Nome + indicador de status */}
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-bold leading-tight truncate text-slate-800">{aula.aluno.nome}</p>
        <span className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.cor}`}>
          {cfg.icon}
        </span>
      </div>
      {aula.horaInicio && (
        <p className="text-[10px] font-medium mt-0.5" style={{ color: cores.text }}>
          {aula.horaInicio}{aula.horaFim ? ` – ${aula.horaFim}` : ""}
        </p>
      )}
      {/* Todas as matérias do aluno */}
      {todasMaterias.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {todasMaterias.map((m) => (
            <span key={m.id}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white leading-none"
              style={{ backgroundColor: m.cor }}>
              {m.nome}
            </span>
          ))}
        </div>
      )}
      {mostrarProfessora && (
        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
          Prof. {aula.professora.usuario.nome}
        </p>
      )}
    </button>
  );
}

function BadgeStatus({ status }: { status: StatusAula }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.cor}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ── Tela de Conflitos ─────────────────────────────────────────────────────────
function TelaConflitos({
  conflitos, semAgenda, onFechar,
}: {
  conflitos: ConflitoDet[];
  semAgenda: SemAgendaDet[];
  onFechar:  () => void;
}) {
  function imprimir() {
    const rowsConflitos = conflitos.map((c) => {
      const [y, m, d] = c.data.split("-").map(Number);
      const dataFmt = `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
      return `<tr>
        <td>${c.alunoNome}</td><td>${dataFmt}</td>
        <td>${c.horaInicio} – ${c.horaFim}</td>
        <td>${c.conflitoCom}</td>
        <td>${c.conflitoHoraInicio} – ${c.conflitoHoraFim}</td>
      </tr>`;
    }).join("");

    const rowsSemAgenda = semAgenda.map((s) =>
      `<tr><td>${s.alunoNome}</td><td>${s.motivo}</td></tr>`
    ).join("");

    const secaoConflitos = conflitos.length > 0 ? `
      <h3 style="margin:24px 0 8px;font-size:15px;color:#dc2626;">⚠️ Conflitos de horário (${conflitos.length})</h3>
      <table>
        <thead><tr>
          <th>Aluno</th><th>Data</th><th>Horário tentado</th><th>Conflito com</th><th>Horário ocupado</th>
        </tr></thead>
        <tbody>${rowsConflitos}</tbody>
      </table>` : "";

    const secaoSemAgenda = semAgenda.length > 0 ? `
      <h3 style="margin:24px 0 8px;font-size:15px;color:#b45309;">📋 Sem parâmetros de agenda (${semAgenda.length})</h3>
      <table>
        <thead><tr><th>Aluno</th><th>Pendência no cadastro</th></tr></thead>
        <tbody>${rowsSemAgenda}</tbody>
      </table>` : "";

    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Relatório de Geração de Agenda</title>
      <style>
        body  { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
        h2    { margin-bottom: 4px; font-size: 18px; }
        p     { margin: 0 0 8px; font-size: 12px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
        th    { background: #f1f5f9; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 600; }
        td    { padding: 7px 10px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h2>Relatório de Geração de Agenda</h2>
      <p>Gerado em ${new Date().toLocaleString("pt-BR")}</p>
      ${secaoConflitos}
      ${secaoSemAgenda}
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Relatório de geração de agenda</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {conflitos.length > 0  && `${conflitos.length} conflito(s) de horário`}
              {conflitos.length > 0 && semAgenda.length > 0 && " · "}
              {semAgenda.length > 0  && `${semAgenda.length} aluno(s) sem parâmetros de agenda`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={imprimir}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimir
            </button>
            <button onClick={onFechar}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="overflow-auto flex-1 px-4 py-4 space-y-5">

          {/* Seção conflitos */}
          {conflitos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                ⚠️ Conflitos de horário — {conflitos.length} aula(s) não gerada(s)
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-red-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Aluno</th>
                    <th className="text-left px-4 py-2.5">Data</th>
                    <th className="text-left px-4 py-2.5">Horário tentado</th>
                    <th className="text-left px-4 py-2.5">Conflito com</th>
                    <th className="text-left px-4 py-2.5">Horário ocupado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {conflitos.map((c, i) => {
                    const [y, m, d] = c.data.split("-").map(Number);
                    const dataFmt = `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{c.alunoNome}</td>
                        <td className="px-4 py-3 text-slate-600">{dataFmt}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            {c.horaInicio} – {c.horaFim}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.conflitoCom}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            {c.conflitoHoraInicio} – {c.conflitoHoraFim}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Seção sem agenda */}
          {semAgenda.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                📋 Sem parâmetros de agenda — {semAgenda.length} aluno(s) ignorado(s)
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-amber-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Aluno</th>
                    <th className="text-left px-4 py-2.5">Pendência no cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {semAgenda.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.alunoNome}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          {s.motivo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onFechar}
            className="px-5 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{titulo}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

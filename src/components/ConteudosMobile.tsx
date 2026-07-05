"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Pencil, Trash2, Paperclip, X, Loader2, AlertCircle, Home, LogOut,
} from "lucide-react";

type Materia = { id: string; nome: string; cor: string };
type Aluno = {
  id: string;
  nome: string;
  professoraId: string | null;
  materias: { materiaId: string; materia: Materia }[];
};
type Professora = { id: string; nome: string };
type AgendaInfo = {
  id: string;
  horaInicio: string | null;
  horaFim: string | null;
  status: string;
  materia: { nome: string; cor: string } | null;
  aluno: { nome: string } | null;
};
type Candidata = {
  id: string;
  horaInicio: string | null;
  horaFim: string | null;
  status: string;
  materia: { nome: string; cor: string } | null;
};
type Conteudo = {
  id: string;
  alunoId: string;
  materiaId: string | null;
  topico: string;
  descricao: string | null;
  arquivoUrl: string | null;
  data: string;
  planejado: boolean;
  aluno: { nome: string; professora: string | null };
  materia: Materia | null;
  agenda: AgendaInfo | null;
};
type FormC = {
  alunoId: string;
  materiaId: string | null;
  topico: string;
  descricao: string;
  arquivoUrl: string;
  arquivoNome: string;
  data: string;
  planejado: boolean;
};

function parseDataLocal(iso: string) {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

const formVazio = (): FormC => ({
  alunoId: "",
  materiaId: "",
  topico: "",
  descricao: "",
  arquivoUrl: "",
  arquivoNome: "",
  data: new Date().toISOString().split("T")[0],
  planejado: true,
});

const STATUS_AGENDA: Record<string, { label: string; color: string }> = {
  AGENDADA:        { label: "Agendada",       color: "bg-blue-100 text-blue-700" },
  REALIZADA:       { label: "Realizada",      color: "bg-emerald-100 text-emerald-700" },
  CANCELADA:       { label: "Cancelada",      color: "bg-red-100 text-red-600" },
  FALTA_ALUNO:     { label: "Falta do Aluno", color: "bg-orange-100 text-orange-700" },
  FALTA_PROFESSOR: { label: "Falta do Prof.", color: "bg-purple-100 text-purple-700" },
};

// ── Campos do formulário (criar/editar) — componente à parte evita remount a cada tecla ──
function CamposFormMobile({
  form, setForm, alunos, professoras, isProfessor, filtroProfId, setFiltroProfId,
  enviandoArquivo, onUpload, onCampoChave,
}: {
  form: FormC;
  setForm: (f: FormC) => void;
  alunos: Aluno[];
  professoras: Professora[];
  isProfessor: boolean;
  filtroProfId: string;
  setFiltroProfId: (id: string) => void;
  enviandoArquivo: boolean;
  onUpload: (file: File) => void;
  onCampoChave?: () => void;
}) {
  const alunosFiltrados = isProfessor ? alunos : (filtroProfId ? alunos.filter((a) => a.professoraId === filtroProfId) : []);
  const alunoSel = alunos.find((a) => a.id === form.alunoId);
  const materiasFiltradas = alunoSel?.materias.map((am) => am.materia) ?? [];

  return (
    <div className="space-y-3">
      {!isProfessor && (
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Professor(a)</label>
          <select value={filtroProfId}
            onChange={(e) => { setFiltroProfId(e.target.value); setForm({ ...form, alunoId: "", materiaId: "" }); onCampoChave?.(); }}
            className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white">
            <option value="">Selecione...</option>
            {professoras.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Aluno *</label>
        <select value={form.alunoId}
          onChange={(e) => { setForm({ ...form, alunoId: e.target.value, materiaId: "" }); onCampoChave?.(); }}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white">
          <option value="">Selecione...</option>
          {alunosFiltrados.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Matéria</label>
        <select value={form.materiaId ?? ""} disabled={!form.alunoId}
          onChange={(e) => setForm({ ...form, materiaId: e.target.value || null })}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white disabled:opacity-50">
          <option value="">{form.alunoId ? "Todas as matérias" : "—"}</option>
          {materiasFiltradas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Data *</label>
        <input type="date" value={form.data}
          onChange={(e) => {
            const hoje = new Date().toISOString().split("T")[0];
            const futuro = e.target.value > hoje;
            setForm({ ...form, data: e.target.value, planejado: futuro ? true : form.planejado });
            onCampoChave?.();
          }}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm"/>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Tópico *</label>
        <input value={form.topico} onChange={(e) => setForm({ ...form, topico: e.target.value })}
          placeholder="Ex: Equações do 2º grau"
          className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm"/>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
        <textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm resize-none"/>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1">Anexo</label>
        {form.arquivoUrl ? (
          <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2.5">
            <span className="text-sm text-slate-600 truncate flex items-center gap-1.5">
              <Paperclip size={14} className="shrink-0"/> {form.arquivoNome || "arquivo"}
            </span>
            <button type="button" onClick={() => setForm({ ...form, arquivoUrl: "", arquivoNome: "" })}>
              <X size={16} className="text-slate-400"/>
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-500 cursor-pointer">
            {enviandoArquivo ? <Loader2 size={16} className="animate-spin"/> : <Paperclip size={16}/>}
            {enviandoArquivo ? "Enviando..." : "Anexar arquivo"}
            <input type="file" className="hidden" disabled={enviandoArquivo}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}/>
          </label>
        )}
      </div>
    </div>
  );
}

export default function ConteudosMobile({
  alunos, professoras = [], conteudosIniciais, isProfessor, nomeUsuario,
}: {
  alunos: Aluno[];
  professoras?: Professora[];
  conteudosIniciais: Conteudo[];
  isProfessor: boolean;
  nomeUsuario: string;
}) {
  const router = useRouter();

  const [conteudos, setConteudos]   = useState(conteudosIniciais);
  const [modal, setModal]           = useState(false);
  const [novo, setNovo]             = useState<FormC>(formVazio());
  const [editConteudo, setEditConteudo] = useState<(FormC & { id: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; topico: string } | null>(null);
  const [filtroProfId, setFiltroProfId]   = useState("");
  const [salvando, setSalvando]           = useState(false);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [erroNovo, setErroNovo]     = useState("");
  const [avisoDuplicado, setAvisoDuplicado] = useState<string | null>(null);
  const [candidatasNovo, setCandidatasNovo] = useState<Candidata[] | null>(null);
  const [erroEdit, setErroEdit]     = useState("");
  const [candidatasEdit, setCandidatasEdit] = useState<Candidata[] | null>(null);
  const [erroDelete, setErroDelete] = useState("");

  async function uploadArquivo(file: File, alvo: "novo" | "edit") {
    setEnviandoArquivo(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (alvo === "novo") setErroNovo(data.erro ?? "Erro ao enviar arquivo.");
        else setErroEdit(data.erro ?? "Erro ao enviar arquivo.");
        return;
      }
      if (alvo === "novo") setNovo((p) => ({ ...p, arquivoUrl: data.url, arquivoNome: data.nome }));
      else setEditConteudo((p) => p && ({ ...p, arquivoUrl: data.url, arquivoNome: data.nome }));
    } finally {
      setEnviandoArquivo(false);
    }
  }

  async function criarConteudo(forcar = false, aulaIdEscolhido?: string) {
    setSalvando(true);
    setErroNovo("");
    setCandidatasNovo(null);
    try {
      const res = await fetch("/api/conteudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...novo, arquivoUrl: novo.arquivoUrl || null, forcar, aulaIdEscolhido }),
      });
      const data = await res.json();
      if (res.status === 409 && data.aviso) {
        setAvisoDuplicado(data.aviso);
        return;
      }
      if (!res.ok) {
        if (data.candidatas?.length > 0) {
          setCandidatasNovo(data.candidatas);
          return;
        }
        setErroNovo(data.erro ?? "Erro ao registrar conteúdo.");
        return;
      }
      setAvisoDuplicado(null);
      const conteudoNovo = {
        ...data,
        aluno: { nome: data.aluno.nome, professora: data.aluno.professora?.usuario?.nome ?? null },
      };
      setConteudos((prev) => [conteudoNovo, ...prev]);
      setModal(false);
      setNovo(formVazio());
    } catch {
      setErroNovo("Erro de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConteudo(aulaIdEscolhido?: string) {
    if (!editConteudo) return;
    setSalvando(true);
    setErroEdit("");
    setCandidatasEdit(null);

    const original = conteudos.find((c) => c.id === editConteudo.id);
    const mudandoParaMinistrado = original?.planejado === true && editConteudo.planejado === false;
    const mudandoParaPlanejado  = original?.planejado === false && editConteudo.planejado === true;

    try {
      if (mudandoParaPlanejado) {
        const resPut = await fetch(`/api/conteudos/${editConteudo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editConteudo, planejado: false, arquivoUrl: editConteudo.arquivoUrl || null }),
        });
        if (!resPut.ok) {
          const d = await resPut.json();
          setErroEdit(d.erro ?? "Erro ao salvar conteúdo.");
          return;
        }
        const resRev = await fetch(`/api/conteudos/${editConteudo.id}/reverter`, { method: "POST" });
        const dRev = await resRev.json();
        if (!resRev.ok) {
          setErroEdit(dRev.erro ?? "Erro ao reverter para Planejado.");
          return;
        }
        setConteudos((prev) => prev.map((c) => c.id === editConteudo.id ? { ...c, ...editConteudo, planejado: true } : c));
        setEditConteudo(null);
        return;
      }

      if (mudandoParaMinistrado) {
        const resPut = await fetch(`/api/conteudos/${editConteudo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editConteudo, planejado: true, arquivoUrl: editConteudo.arquivoUrl || null, aulaIdEscolhido: aulaIdEscolhido || undefined }),
        });
        if (!resPut.ok) {
          const d = await resPut.json();
          if (d.candidatas?.length > 0) {
            setCandidatasEdit(d.candidatas);
            return;
          }
          setErroEdit(d.erro ?? "Erro ao salvar conteúdo.");
          return;
        }
        const resMin = await fetch(`/api/conteudos/${editConteudo.id}/ministrado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aulaId: aulaIdEscolhido || undefined }),
        });
        const dMin = await resMin.json();
        if (!resMin.ok) {
          if (dMin.candidatas?.length > 0) {
            setCandidatasEdit(dMin.candidatas);
            return;
          }
          setErroEdit(dMin.erro ?? "Erro ao marcar como Ministrado.");
          return;
        }
        setCandidatasEdit(null);
        setConteudos((prev) => prev.map((c) => c.id === editConteudo.id ? { ...c, ...editConteudo, planejado: false } : c));
        setEditConteudo(null);
        return;
      }

      const res = await fetch(`/api/conteudos/${editConteudo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editConteudo, arquivoUrl: editConteudo.arquivoUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroEdit(data.erro ?? "Erro ao salvar conteúdo.");
        return;
      }
      setConteudos((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      setEditConteudo(null);
    } catch {
      setErroEdit("Erro de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirConteudo() {
    if (!confirmDelete) return;
    setErroDelete("");
    setSalvando(true);
    const res = await fetch(`/api/conteudos/${confirmDelete.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setErroDelete(data.erro ?? "Erro ao excluir.");
      setSalvando(false);
      return;
    }
    setConteudos((prev) => prev.filter((c) => c.id !== confirmDelete.id));
    setConfirmDelete(null);
    setSalvando(false);
  }

  function abrirEdit(c: Conteudo) {
    const profId = alunos.find((a) => a.id === c.alunoId)?.professoraId;
    if (profId) setFiltroProfId(profId);
    setErroEdit("");
    setCandidatasEdit(null);
    setEditConteudo({
      id: c.id,
      alunoId: c.alunoId,
      materiaId: c.materiaId,
      topico: c.topico,
      descricao: c.descricao ?? "",
      arquivoUrl: c.arquivoUrl ?? "",
      arquivoNome: c.arquivoUrl ? c.arquivoUrl.split("/").pop() ?? "" : "",
      data: c.data.split("T")[0],
      planejado: c.planejado,
    });
  }

  const conteudosFiltrados = filtroProfId
    ? conteudos.filter((c) => alunos.find((a) => a.id === c.alunoId)?.professoraId === filtroProfId)
    : conteudos;

  const podeSalvarNovo = !!novo.alunoId && !!novo.topico && !!novo.data;
  const podeSalvarEdit = !!editConteudo?.alunoId && !!editConteudo?.topico && !!editConteudo?.data;

  return (
    <div className="flex flex-col h-dvh bg-slate-100 select-none overflow-hidden">
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="bg-indigo-600 text-white px-4 pt-safe pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/m")} className="opacity-75 hover:opacity-100">
            <Home size={18}/>
          </button>
          <div>
            <p className="text-xs opacity-75">EduGestão</p>
            <p className="text-sm font-bold leading-tight truncate max-w-[160px]">{nomeUsuario}</p>
          </div>
        </div>
        <button onClick={() => router.push("/api/auth/signout")} className="opacity-75 hover:opacity-100">
          <LogOut size={18}/>
        </button>
      </div>

      {/* ── Filtro professor (admin) ──────────────────────────────────────── */}
      {!isProfessor && professoras.length > 0 && (
        <div className="bg-white border-b border-slate-200 px-4 py-2 shrink-0">
          <select value={filtroProfId} onChange={(e) => setFiltroProfId(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas as professoras</option>
            {professoras.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      )}

      {/* ── Lista de conteúdos ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-24">
        {conteudosFiltrados.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-16">
            <p className="text-2xl mb-2">📚</p>
            <p>Nenhum conteúdo registrado ainda.</p>
          </div>
        ) : (
          conteudosFiltrados.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-stretch">
                <div className="w-1.5 shrink-0" style={{ backgroundColor: c.materia?.cor ?? "#94a3b8" }}/>
                <div className="flex-1 px-4 py-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-800 text-sm">{c.topico}</p>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                      {format(parseDataLocal(c.data), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {c.planejado ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-medium">📋 Planejado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-medium">✅ Ministrado</span>
                    )}
                    {c.arquivoUrl && (
                      <a href={c.arquivoUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded font-medium">
                        <Paperclip size={10}/> Anexo
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {c.aluno.nome}{c.materia ? ` · ${c.materia.nome}` : ""}
                    {!isProfessor && c.aluno.professora && <span className="text-slate-400"> · {c.aluno.professora}</span>}
                  </p>

                  {c.agenda && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                      <span>📅</span>
                      {c.agenda.horaInicio && c.agenda.horaFim && (
                        <span className="font-medium text-slate-600">{c.agenda.horaInicio}–{c.agenda.horaFim}</span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded font-medium ${(STATUS_AGENDA[c.agenda.status] ?? { label: c.agenda.status, color: "bg-slate-100 text-slate-600" }).color}`}>
                        {(STATUS_AGENDA[c.agenda.status] ?? { label: c.agenda.status }).label}
                      </span>
                      {c.agenda.aluno && <span>· {c.agenda.aluno.nome}</span>}
                      {c.agenda.materia && <span>· {c.agenda.materia.nome}</span>}
                    </div>
                  )}

                  {c.descricao && <p className="text-xs text-slate-600 mt-1">{c.descricao}</p>}

                  <div className="flex items-center gap-1.5 mt-2">
                    <button onClick={() => abrirEdit(c)}
                      className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded-lg px-2 py-1">
                      <Pencil size={12}/> Editar
                    </button>
                    <button onClick={() => { setErroDelete(""); setConfirmDelete({ id: c.id, topico: c.topico }); }}
                      className="flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 rounded-lg px-2 py-1">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Botão flutuante novo conteúdo ──────────────────────────────────── */}
      <button onClick={() => { setNovo(formVazio()); setErroNovo(""); setAvisoDuplicado(null); setCandidatasNovo(null); setModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40">
        <Plus size={24}/>
      </button>

      {/* ── Modal registrar conteúdo ────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Registrar Conteúdo</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>

            <CamposFormMobile
              form={novo} setForm={setNovo}
              alunos={alunos} professoras={professoras} isProfessor={isProfessor}
              filtroProfId={filtroProfId} setFiltroProfId={setFiltroProfId}
              enviandoArquivo={enviandoArquivo}
              onUpload={(f) => uploadArquivo(f, "novo")}
              onCampoChave={() => { setErroNovo(""); setAvisoDuplicado(null); }}
            />

            {erroNovo && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroNovo}</p>
            )}
            {avisoDuplicado && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">⚠️ {avisoDuplicado}</p>
            )}

            {candidatasNovo ? (
              <div className="space-y-2">
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Este aluno tem mais de uma Aula Agendada nesta data/matéria — escolha qual delas vincular:
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {candidatasNovo.map((cand) => (
                    <button key={cand.id} onClick={() => criarConteudo(false, cand.id)} disabled={salvando}
                      className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2.5 text-left disabled:opacity-50">
                      <span className="text-sm text-slate-700">
                        {cand.horaInicio && cand.horaFim ? `${cand.horaInicio}–${cand.horaFim}` : "Sem horário"}
                        {cand.materia ? ` · ${cand.materia.nome}` : ""}
                      </span>
                      <span className="text-xs text-slate-400">{cand.status}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setCandidatasNovo(null)}
                  className="w-full border border-slate-200 text-slate-600 rounded-xl py-3 font-semibold text-sm">
                  Cancelar
                </button>
              </div>
            ) : avisoDuplicado ? (
              <div className="flex gap-3">
                <button onClick={() => criarConteudo(true)} disabled={salvando}
                  className="flex-1 bg-amber-500 text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50">
                  {salvando ? "Salvando..." : "Criar mesmo assim"}
                </button>
                <button onClick={() => setAvisoDuplicado(null)}
                  className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3.5 font-semibold text-sm">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => criarConteudo()} disabled={!podeSalvarNovo || salvando}
                className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
                {salvando ? "Salvando..." : "Registrar"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modal editar conteúdo ───────────────────────────────────────────── */}
      {editConteudo && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setEditConteudo(null)}>
          <div className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Editar Conteúdo</h2>
              <button onClick={() => setEditConteudo(null)}><X size={20} className="text-slate-400"/></button>
            </div>

            <CamposFormMobile
              form={editConteudo} setForm={(f) => setEditConteudo({ ...f, id: editConteudo.id })}
              alunos={alunos} professoras={professoras} isProfessor={isProfessor}
              filtroProfId={filtroProfId} setFiltroProfId={setFiltroProfId}
              enviandoArquivo={enviandoArquivo}
              onUpload={(f) => uploadArquivo(f, "edit")}
              onCampoChave={() => { setErroEdit(""); setCandidatasEdit(null); }}
            />

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
              {conteudos.find((c) => c.id === editConteudo.id)?.planejado === false ? (
                <div className="flex gap-2">
                  <div className="flex-1 py-2.5 rounded-xl text-sm font-medium border bg-slate-50 border-slate-200 text-slate-400 text-center">
                    📋 Planejado
                  </div>
                  <div className="flex-1 py-2.5 rounded-xl text-sm font-medium border bg-emerald-100 border-emerald-300 text-emerald-800 text-center">
                    ✅ Ministrado
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditConteudo({ ...editConteudo, planejado: true })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${editConteudo.planejado ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-white border-slate-200 text-slate-500"}`}>
                    📋 Planejado
                  </button>
                  <button type="button" onClick={() => setEditConteudo({ ...editConteudo, planejado: false })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${!editConteudo.planejado ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-500"}`}>
                    ✅ Ministrado
                  </button>
                </div>
              )}
            </div>

            {erroEdit && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroEdit}</p>
            )}

            {candidatasEdit ? (
              <div className="space-y-2">
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Este aluno tem mais de uma Aula Agendada nesta data/matéria — escolha qual delas vincular:
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {candidatasEdit.map((cand) => (
                    <button key={cand.id} onClick={() => salvarConteudo(cand.id)} disabled={salvando}
                      className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2.5 text-left disabled:opacity-50">
                      <span className="text-sm text-slate-700">
                        {cand.horaInicio && cand.horaFim ? `${cand.horaInicio}–${cand.horaFim}` : "Sem horário"}
                        {cand.materia ? ` · ${cand.materia.nome}` : ""}
                      </span>
                      <span className="text-xs text-slate-400">{cand.status}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setCandidatasEdit(null)}
                  className="w-full border border-slate-200 text-slate-600 rounded-xl py-3 font-semibold text-sm">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => salvarConteudo()} disabled={!podeSalvarEdit || salvando}
                className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modal confirmar exclusão ────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-t-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Confirmar exclusão</h2>
              <button onClick={() => setConfirmDelete(null)}><X size={20} className="text-slate-400"/></button>
            </div>
            <p className="text-sm text-slate-600 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0"/>
              Tem certeza que deseja excluir o conteúdo <strong>&nbsp;{confirmDelete.topico}</strong>?
            </p>
            {erroDelete && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {erroDelete}</p>
            )}
            <div className="flex gap-3">
              <button onClick={excluirConteudo} disabled={salvando}
                className="flex-1 bg-red-600 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
                {salvando ? "Excluindo..." : "Excluir"}
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3 font-semibold text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Paperclip, X, FileText, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Materia = { id: string; nome: string; cor: string };

type Aluno = {
  id: string;
  nome: string;
  professoraId: string | null;
  materias: { materiaId: string; materia: Materia }[];
};

type Professora = { id: string; nome: string };

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

// ── Upload de arquivo ────────────────────────────────────────────────────────
function UploadArquivo({
  arquivoUrl,
  arquivoNome,
  onChange,
}: {
  arquivoUrl: string;
  arquivoNome: string;
  onChange: (url: string, nome: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro("");
    setEnviando(true);
    const fd = new FormData();
    fd.append("arquivo", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setErro(data.erro ?? "Erro ao enviar arquivo.");
      setEnviando(false);
      return;
    }
    onChange(data.url, data.nome);
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">Documento anexo</label>

      {arquivoUrl ? (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
          <FileText size={15} className="text-indigo-600 shrink-0" />
          <a
            href={arquivoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-700 hover:underline flex-1 truncate"
          >
            {arquivoNome || "Arquivo anexado"}
          </a>
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="text-slate-400 hover:text-red-500 transition-colors"
            title="Remover arquivo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 hover:border-indigo-400 rounded-lg px-3 py-2.5 transition-colors group">
          {enviando ? (
            <Loader2 size={15} className="text-indigo-500 animate-spin" />
          ) : (
            <Paperclip size={15} className="text-slate-400 group-hover:text-indigo-500" />
          )}
          <span className="text-sm text-slate-500 group-hover:text-indigo-600">
            {enviando ? "Enviando..." : "Clique para anexar PDF, imagem ou Word (máx. 10 MB)"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleFile}
            disabled={enviando}
            className="hidden"
          />
        </label>
      )}
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  );
}

// ── CamposForm no nível do módulo (evita remount a cada keystroke) ────────────
function CamposForm({
  form,
  setForm,
  alunos,
  professoras,
  materias,
  isProfessor,
  filtroProfId,
  setFiltroProfId,
  somentePlanejado,
  onCampoChave,
}: {
  form: FormC;
  setForm: (f: FormC) => void;
  alunos: Aluno[];
  professoras: Professora[];
  materias: Materia[];
  isProfessor: boolean;
  filtroProfId: string;
  setFiltroProfId: (id: string) => void;
  somentePlanejado?: boolean;
  onCampoChave?: () => void;
}) {
  const filtrados = filtroProfId
    ? alunos.filter((a) => a.professoraId === filtroProfId)
    : alunos;
  const alunosFiltrados = filtrados.length > 0 ? filtrados : alunos;
  const alunoSel = alunos.find((a) => a.id === form.alunoId);
  const materiasFiltradas = alunoSel?.materias.map((am) => am.materia) ?? [];

  return (
    <div className="space-y-3">
      {/* Professor — apenas admin */}
      {!isProfessor && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Professor(a) *</label>
          <select
            value={filtroProfId}
            onChange={(e) => { setFiltroProfId(e.target.value); setForm({ ...form, alunoId: "", materiaId: "" }); onCampoChave?.(); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todos os professores</option>
            {professoras.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Aluno */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Aluno * <span className="text-slate-400 font-normal">({alunosFiltrados.length} disponíveis, {alunos.length} total)</span>
        </label>
        <select
          value={form.alunoId}
          onChange={(e) => { setForm({ ...form, alunoId: e.target.value, materiaId: "" }); onCampoChave?.(); }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Selecione...</option>
          {alunosFiltrados.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
      </div>

      {/* Disciplina filtrada pelo aluno */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina *</label>
        <select
          value={form.materiaId ?? ""}
          onChange={(e) => setForm({ ...form, materiaId: e.target.value || null })}
          disabled={!form.alunoId}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50"
        >
          <option value="">
            {form.alunoId ? "Todas as matérias" : "Selecione o aluno primeiro"}
          </option>
          {materiasFiltradas.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
      </div>

      {/* Tópico */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Tópico *</label>
        <input
          value={form.topico}
          onChange={(e) => setForm({ ...form, topico: e.target.value })}
          placeholder="Ex: Equações do 2º grau"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Descrição (opcional) */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
        <textarea
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {/* Documento anexo */}
      <UploadArquivo
        arquivoUrl={form.arquivoUrl}
        arquivoNome={form.arquivoNome}
        onChange={(url, nome) => setForm({ ...form, arquivoUrl: url, arquivoNome: nome })}
      />

      {/* Data */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Data *</label>
        <input
          type="date"
          value={form.data}
          onChange={(e) => {
            const hoje = new Date().toISOString().split("T")[0];
            const futuro = e.target.value > hoje;
            setForm({ ...form, data: e.target.value, planejado: futuro ? true : form.planejado });
            onCampoChave?.();
          }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────

export default function ConteudosClient({
  alunos,
  professoras = [],
  materias = [],
  conteudosIniciais,
  isProfessor,
}: {
  alunos: Aluno[];
  professoras?: Professora[];
  materias?: Materia[];
  conteudosIniciais: Conteudo[];
  isProfessor: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [conteudos, setConteudos] = useState(conteudosIniciais);
  const [modal, setModal] = useState(false);
  const [novo, setNovo] = useState<FormC>(formVazio());
  const [salvando, setSalvando] = useState(false);
  // Filtro de professora (admin)
  const [filtroProfId, setFiltroProfId] = useState<string>("");
  // aulaId vindo da agenda (para marcar como Realizada após salvar)
  const [aulaIdPendente, setAulaIdPendente] = useState<string | null>(null);

  // Alunos filtrados pelo professor selecionado (admin)
  const alunosFiltrados = filtroProfId
    ? alunos.filter((a) => a.professoraId === filtroProfId)
    : alunos;

  // Abre form pré-preenchido quando vindo da agenda
  useEffect(() => {
    const aulaId    = searchParams.get("aulaId");
    const alunoId   = searchParams.get("alunoId")   ?? "";
    const materiaId = searchParams.get("materiaId") ?? "";
    const data      = searchParams.get("data")      ?? new Date().toISOString().split("T")[0];
    const descricao = searchParams.get("descricao") ?? "";
    if (aulaId) {
      // Pré-seleciona o professor do aluno (admin)
      const aluno = alunos.find((a) => a.id === alunoId);
      if (aluno?.professoraId) setFiltroProfId(aluno.professoraId);
      setAulaIdPendente(aulaId);
      setNovo({ ...formVazio(), alunoId, materiaId, data, descricao, planejado: false });
      setModal(true);
      window.history.replaceState(null, "", "/dashboard/conteudos");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [editConteudo, setEditConteudo] = useState<(FormC & { id: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; topico: string } | null>(null);
  const [erroDelete, setErroDelete] = useState("");
  const [erroNovo, setErroNovo]   = useState("");
  const [erroEdit, setErroEdit]   = useState("");

  async function criarConteudo() {
    setSalvando(true);
    setErroNovo("");
    try {
      const res = await fetch("/api/conteudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...novo, arquivoUrl: novo.arquivoUrl || null, aulaId: aulaIdPendente || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroNovo(data.erro ?? "Erro ao registrar conteúdo.");
        return;
      }
      const conteudoNovo = {
        ...data,
        aluno: {
          nome: data.aluno.nome,
          professora: data.aluno.professora?.usuario?.nome ?? null,
        },
      };
      setConteudos((prev) => [conteudoNovo, ...prev]);

      // Se veio da agenda, marca a aula como Realizada
      if (aulaIdPendente) {
        const patchRes = await fetch(`/api/agenda/${aulaIdPendente}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status: "REALIZADA" }),
        });
        if (!patchRes.ok) {
          const patchJson = await patchRes.json().catch(() => ({}));
          setErroNovo(`Conteúdo salvo, mas não foi possível atualizar a agenda: ${patchJson.erro ?? "erro desconhecido"}`);
          setAulaIdPendente(null);
          return;
        }
        setAulaIdPendente(null);
        router.push("/dashboard/agenda");
        return;
      }

      setModal(false);
      setNovo(formVazio());
    } catch {
      setErroNovo("Erro de comunicação com o servidor.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConteudo() {
    if (!editConteudo) return;
    setSalvando(true);
    setErroEdit("");
    try {
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

  const podeSalvarNovo = !!novo.alunoId && !!novo.topico && !!novo.data;
  const podeSalvarEdit =
    !!editConteudo?.alunoId &&
    !!editConteudo?.topico &&
    !!editConteudo?.data;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setModal(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <Plus size={15} />
        Registrar conteúdo
      </button>

      <div className="space-y-2">
        {conteudos.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
            Nenhum conteúdo registrado ainda.
          </div>
        ) : (
          conteudos.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 group"
            >
              <div
                className="w-2 self-stretch rounded-full mt-1 shrink-0"
                style={{ backgroundColor: c.materia?.cor ?? "#94a3b8" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800 text-sm">{c.topico}</span>

                  {/* Status: Planejado / Ministrado */}
                  {c.planejado ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded font-medium">
                      📋 Planejado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded font-medium">
                      ✅ Ministrado
                    </span>
                  )}

                  {c.arquivoUrl && (
                    <a
                      href={c.arquivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs px-1.5 py-0.5 rounded font-medium transition-colors"
                      title="Ver documento"
                    >
                      <Paperclip size={11} />
                      Anexo
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-0.5">
                  {c.aluno.nome}{c.materia ? ` · ${c.materia.nome}` : ""}
                  {!isProfessor && c.aluno.professora && (
                    <span className="text-slate-400"> · {c.aluno.professora}</span>
                  )}
                </p>

                {c.descricao && (
                  <p className="text-sm text-slate-600 mt-1">{c.descricao}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {format(parseDataLocal(c.data), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => abrirEdit(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { setErroDelete(""); setConfirmDelete({ id: c.id, topico: c.topico }); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Modal Registrar Conteúdo ──────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            {/* Cabeçalho fixo */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Registrar Conteúdo</h2>
            </div>

            {/* Corpo rolável */}
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <CamposForm
                form={novo}
                setForm={setNovo}
                alunos={alunos}
                professoras={professoras}
                materias={materias}
                isProfessor={isProfessor}
                filtroProfId={filtroProfId}
                setFiltroProfId={setFiltroProfId}
                somentePlanejado={!aulaIdPendente}
                onCampoChave={() => setErroNovo("")}
              />
            </div>

            {/* Rodapé fixo — erro + botões sempre visíveis */}
            <div className="px-6 pb-6 pt-3 border-t border-slate-100 shrink-0 space-y-3">
              {erroNovo && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">{erroNovo}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={criarConteudo}
                  disabled={!podeSalvarNovo || salvando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {salvando ? "Salvando..." : "Registrar"}
                </button>
                <button
                  onClick={() => { setModal(false); setNovo(formVazio()); setErroNovo(""); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Conteúdo ─────────────────────────────────────────── */}
      {editConteudo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            {/* Cabeçalho fixo */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Editar Conteúdo</h2>
            </div>

            {/* Corpo rolável */}
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <CamposForm
                form={editConteudo}
                setForm={(f) => setEditConteudo({ ...f, id: editConteudo.id })}
                alunos={alunos}
                professoras={professoras}
                materias={materias}
                isProfessor={isProfessor}
                filtroProfId={filtroProfId}
                setFiltroProfId={setFiltroProfId}
                somentePlanejado={true}
                onCampoChave={() => setErroEdit("")}
              />
            </div>

            {/* Rodapé fixo — erro + botões sempre visíveis */}
            <div className="px-6 pb-6 pt-3 border-t border-slate-100 shrink-0 space-y-3">
              {erroEdit && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">{erroEdit}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={salvarConteudo}
                  disabled={!podeSalvarEdit || salvando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button
                  onClick={() => { setEditConteudo(null); setErroEdit(""); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ──────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir o conteúdo <strong>{confirmDelete.topico}</strong>?
            </p>
            {erroDelete && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erroDelete}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={excluirConteudo}
                disabled={salvando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Excluindo..." : "Excluir"}
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

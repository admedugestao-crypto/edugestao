"use client";

import { useState } from "react";
import { Plus, FileText, Download, Pencil, Trash2, Upload, Search } from "lucide-react";
import { SERIES } from "@/lib/series";
import { PDFDocument } from "pdf-lib";

const TIPOS_WORD = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Fotos de celular costumam vir enormes (vários MB cada) — juntar 3-4 delas
// num PDF facilmente estoura o limite de upload. Redimensiona pro maior lado
// caber em MAX_LADO e reencoda como JPEG com qualidade reduzida, o que
// derruba bastante o tamanho final sem comprometer a leitura do conteúdo.
const MAX_LADO = 1800;
const QUALIDADE_JPEG = 0.75;

async function comprimirImagem(bytes: ArrayBuffer): Promise<{ bytes: ArrayBuffer; width: number; height: number }> {
  const blob = new Blob([bytes]);
  const bitmap = await createImageBitmap(blob);
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * escala);
  const height = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);

  const jpegBlob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao comprimir imagem."))), "image/jpeg", QUALIDADE_JPEG)
  );
  return { bytes: await jpegBlob.arrayBuffer(), width, height };
}

// O navegador/SO às vezes não preenche file.type (comum com PDF vindo de
// certos apps de scanner ou caminhos de rede/OneDrive) — nesse caso, usa a
// extensão do nome do arquivo como pista.
function tipoReal(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "";
}

// Unifica varios arquivos (PDF e/ou imagem) num unico PDF, um por pagina, na
// ordem em que foram selecionados. Se só vier 1 arquivo, retorna ele mesmo
// sem conversao nenhuma.
async function unificarArquivos(files: File[]): Promise<File> {
  if (files.length === 1) return files[0];

  const doc = await PDFDocument.create();

  for (const file of files) {
    try {
      const bytes = await file.arrayBuffer();
      const tipo = tipoReal(file);

      if (tipo === "application/pdf") {
        const origem = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const paginas = await doc.copyPages(origem, origem.getPageIndices());
        paginas.forEach((p) => doc.addPage(p));
        continue;
      }

      const comprimida = await comprimirImagem(bytes);
      const imagem = await doc.embedJpg(comprimida.bytes);
      const pagina = doc.addPage([imagem.width, imagem.height]);
      pagina.drawImage(imagem, { x: 0, y: 0, width: imagem.width, height: imagem.height });
    } catch (err) {
      console.error(`Falha ao processar "${file.name}" na unificação:`, err);
      throw new Error(`Não consegui processar o arquivo "${file.name}".`);
    }
  }

  const pdfBytes = new Uint8Array(await doc.save());
  return new File([pdfBytes], "material-unificado.pdf", { type: "application/pdf" });
}

type Materia = { id: string; nome: string; cor: string };
type MetodoEnsino = { id: string; nome: string };

type Material = {
  id: string;
  titulo: string;
  descricao: string | null;
  metodoId: string | null;
  metodoEnsino: MetodoEnsino | null;
  serie: string | null;
  materiaId: string | null;
  materia: Materia | null;
  arquivoUrl: string;
  arquivoNome: string | null;
};

const formVazio = {
  titulo: "",
  descricao: "",
  metodoId: "",
  serie: "",
  materiaId: "",
  arquivoUrl: "",
  arquivoNome: "",
};

export default function BibliotecaClient({
  materiaisIniciais,
  materias,
  metodos,
}: {
  materiaisIniciais: Material[];
  materias: Materia[];
  metodos: MetodoEnsino[];
}) {
  const [materiais, setMateriais] = useState(materiaisIniciais);
  const [busca, setBusca] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroSerie, setFiltroSerie] = useState("");
  const [filtroMateriaId, setFiltroMateriaId] = useState("");

  const [modalNovo, setModalNovo] = useState(false);
  const [novo, setNovo] = useState(formVazio);
  const [editando, setEditando] = useState<(typeof formVazio & { id: string }) | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [unificando, setUnificando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; titulo: string } | null>(null);

  const materiaisFiltrados = materiais.filter((m) => {
    if (filtroMetodo && m.metodoId !== filtroMetodo) return false;
    if (filtroSerie && m.serie !== filtroSerie) return false;
    if (filtroMateriaId && m.materiaId !== filtroMateriaId) return false;
    if (busca) {
      const termo = busca.trim().toLowerCase();
      const noTitulo = m.titulo.toLowerCase().includes(termo);
      const naDescricao = (m.descricao ?? "").toLowerCase().includes(termo);
      if (!noTitulo && !naDescricao) return false;
    }
    return true;
  });

  async function enviarArquivo(file: File, aplicar: (url: string, nome: string) => void) {
    setEnviandoArquivo(true);
    setErro("");
    try {
      const tamanhoMb = (file.size / (1024 * 1024)).toFixed(1);
      const formData = new FormData();
      formData.append("arquivo", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });

      const textoResposta = await res.text();
      let data: any = null;
      try { data = JSON.parse(textoResposta); } catch { /* resposta nao-JSON tratada abaixo */ }

      if (!res.ok || !data) {
        if (res.status === 413 || !data) {
          setErro(`Arquivo muito grande pra enviar (${tamanhoMb} MB). Tente com menos páginas por vez.`);
        } else {
          setErro(data.erro ?? `Erro ao enviar arquivo (status ${res.status}).`);
        }
        return;
      }
      aplicar(data.url, data.nome);
    } finally {
      setEnviandoArquivo(false);
    }
  }

  // Chamado pelo onChange dos dois campos de arquivo. Se mais de um arquivo
  // for escolhido, unifica tudo num PDF só antes de enviar.
  async function selecionarArquivos(fileList: FileList | null, aplicar: (url: string, nome: string) => void) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    if (files.length > 1) {
      if (files.some((f) => TIPOS_WORD.includes(f.type))) {
        setErro("Não é possível unificar um arquivo Word com outros. Selecione só um arquivo Word por vez, ou combine apenas PDFs/imagens.");
        return;
      }
      setUnificando(true);
      setErro("");
      try {
        const unico = await unificarArquivos(files);
        console.log(`PDF unificado: ${(unico.size / (1024 * 1024)).toFixed(2)} MB`);
        await enviarArquivo(unico, aplicar);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao unificar os arquivos selecionados.");
      } finally {
        setUnificando(false);
      }
      return;
    }

    await enviarArquivo(files[0], aplicar);
  }

  function camposFaltando(m: typeof formVazio): string[] {
    const faltando: string[] = [];
    if (!m.titulo) faltando.push("Título");
    if (!m.descricao) faltando.push("Descrição");
    if (!m.metodoId) faltando.push("Método");
    if (!m.serie) faltando.push("Série");
    if (!m.materiaId) faltando.push("Disciplina");
    if (!m.arquivoUrl) faltando.push("Arquivo");
    return faltando;
  }

  function materialCompleto(m: typeof formVazio) {
    return camposFaltando(m).length === 0;
  }

  async function criarMaterial() {
    if (!materialCompleto(novo)) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/biblioteca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novo),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao criar material.");
        return;
      }
      setMateriais((prev) => [data, ...prev]);
      setModalNovo(false);
      setNovo(formVazio);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao() {
    if (!editando || !materialCompleto(editando)) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/biblioteca/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editando),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao salvar.");
        return;
      }
      setMateriais((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      setEditando(null);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMaterial() {
    if (!confirmDelete) return;
    setSalvando(true);
    try {
      await fetch(`/api/biblioteca/${confirmDelete.id}`, { method: "DELETE" });
      setMateriais((prev) => prev.filter((m) => m.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou descrição..."
              className="border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <select
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os métodos</option>
            {metodos.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          <select
            value={filtroSerie}
            onChange={(e) => setFiltroSerie(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as séries</option>
            {SERIES.flatMap((g) => g.opcoes).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filtroMateriaId}
            onChange={(e) => setFiltroMateriaId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as disciplinas</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          <button
            onClick={() => { setErro(""); setModalNovo(true); }}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Novo material
          </button>
        </div>
      </div>

      {/* Lista */}
      {materiaisFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          Nenhum material cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materiaisFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{m.titulo}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[m.metodoEnsino?.nome, m.serie, m.materia?.nome].filter(Boolean).join(" · ") || "Sem categorização"}
                  </p>
                </div>
              </div>
              {m.descricao && <p className="text-xs text-slate-500 line-clamp-2">{m.descricao}</p>}
              <div className="flex items-center gap-1 mt-auto pt-2">
                <a
                  href={m.arquivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg py-1.5 transition-colors"
                >
                  <Download size={13} /> Baixar
                </a>
                <button
                  onClick={() => {
                    setErro("");
                    setEditando({
                      id: m.id,
                      titulo: m.titulo,
                      descricao: m.descricao ?? "",
                      metodoId: m.metodoId ?? "",
                      serie: m.serie ?? "",
                      materiaId: m.materiaId ?? "",
                      arquivoUrl: m.arquivoUrl,
                      arquivoNome: m.arquivoNome ?? "",
                    });
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: m.id, titulo: m.titulo })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Material */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Novo Material</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input
                  value={novo.titulo}
                  onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Apostila de frações"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
                <textarea
                  value={novo.descricao}
                  onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Método *</label>
                  <select
                    value={novo.metodoId}
                    onChange={(e) => setNovo({ ...novo, metodoId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione...</option>
                    {metodos.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                  {metodos.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Nenhum método cadastrado — cadastre em Tabelas → Métodos de Ensino.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Série *</label>
                  <select
                    value={novo.serie}
                    onChange={(e) => setNovo({ ...novo, serie: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione...</option>
                    {SERIES.map((g) => (
                      <optgroup key={g.grupo} label={g.grupo}>
                        {g.opcoes.map((s) => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina *</label>
                <select
                  value={novo.materiaId}
                  onChange={(e) => setNovo({ ...novo, materiaId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Selecione...</option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arquivo *</label>
                <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload size={15} />
                  {unificando ? "Unificando arquivos..." : enviandoArquivo ? "Enviando..." : novo.arquivoNome || "Escolher arquivo (PDF, imagem ou Word)"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    multiple
                    className="hidden"
                    disabled={enviandoArquivo || unificando}
                    onChange={(e) => {
                      selecionarArquivos(e.target.files, (url, nome) => setNovo((p) => ({ ...p, arquivoUrl: url, arquivoNome: nome })));
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {!materialCompleto(novo) && !salvando && !enviandoArquivo && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                Falta preencher: {camposFaltando(novo).join(", ")}.
              </p>
            )}
            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erro}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={criarMaterial}
                disabled={!materialCompleto(novo) || salvando || enviandoArquivo}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Criar material"}
              </button>
              <button
                onClick={() => { setModalNovo(false); setNovo(formVazio); setErro(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Material */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Editar Material</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input
                  value={editando.titulo}
                  onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
                <textarea
                  value={editando.descricao}
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Método *</label>
                  <select
                    value={editando.metodoId}
                    onChange={(e) => setEditando({ ...editando, metodoId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione...</option>
                    {metodos.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Série *</label>
                  <select
                    value={editando.serie}
                    onChange={(e) => setEditando({ ...editando, serie: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione...</option>
                    {SERIES.map((g) => (
                      <optgroup key={g.grupo} label={g.grupo}>
                        {g.opcoes.map((s) => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina *</label>
                <select
                  value={editando.materiaId}
                  onChange={(e) => setEditando({ ...editando, materiaId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Selecione...</option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Arquivo *</label>
                <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload size={15} />
                  {unificando ? "Unificando arquivos..." : enviandoArquivo ? "Enviando..." : editando.arquivoNome || "Substituir arquivo"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    multiple
                    className="hidden"
                    disabled={enviandoArquivo || unificando}
                    onChange={(e) => {
                      selecionarArquivos(e.target.files, (url, nome) => setEditando((p) => p && ({ ...p, arquivoUrl: url, arquivoNome: nome })));
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {!materialCompleto(editando) && !salvando && !enviandoArquivo && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                Falta preencher: {camposFaltando(editando).join(", ")}.
              </p>
            )}
            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{erro}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={salvarEdicao}
                disabled={!materialCompleto(editando) || salvando || enviandoArquivo}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={() => { setEditando(null); setErro(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Confirmar exclusão</h2>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja excluir <strong>{confirmDelete.titulo}</strong>?
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={excluirMaterial}
                disabled={salvando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {salvando ? "Excluindo..." : "Excluir"}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
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

"use client";

import { useState, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle,
  DollarSign, TrendingUp, TrendingDown, Users, Check, X, MessageSquare,
  ArrowLeft, Mail, RefreshCw, Send, Plus, Pencil, Trash2,
} from "lucide-react";
import Link from "next/link";

// ── Constantes ────────────────────────────────────────────────────────────────
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TIPO_LABEL: Record<string, string> = {
  MENSAL: "Mensal", QUINZENAL: "Quinzenal", SEMANAL: "Semanal", POR_AULA: "Por aula",
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
type PagamentoItem = {
  id:              string;
  alunoId:         string;
  mes:             number;
  ano:             number;
  parcela:         number;
  dataVencimento:  string;
  valorCobrado:    number;
  quantidadeAulas: number | null;
  pago:            boolean;
  dataPagamento:   string | null;
  observacao:      string | null;
  emailTipo:       string | null;
  emailEnviadoEm:  string | null;
  aluno: {
    id:               string;
    nome:             string;
    tipoCobranca:     string;
    valorCobranca:    number;
    responsavel:      string | null;
    emailResponsavel: string | null;
    unidade:   { nome: string; escola: { nome: string } };
    professora: string | null;
  };
};

type AulaRealizada = {
  id:         string;
  data:       string;
  horaInicio: string | null;
  horaFim:    string | null;
  materia:    string | null;
};

type AlunoSimples = {
  id:            string;
  nome:          string;
  tipoCobranca:  string | null;
  valorCobranca: number | null;
  professora:    string | null;   // nome da professora
  unidade:       { nome: string; escola: { nome: string } };
};

type FormPag = {
  modo:           "criar" | "editar";
  id?:            string;
  alunoId:        string;
  parcela:        string;
  dataVencimento: string;   // "YYYY-MM-DD"
  valorCobrado:   string;
  quantidadeAulas: string;
  pago:           boolean;
  dataPagamento:  string;   // "YYYY-MM-DD" ou ""
  observacao:     string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function status(item: PagamentoItem): "pago" | "atrasado" | "avencer" {
  if (item.pago) return "pago";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const venc = new Date(item.dataVencimento);
  return venc < hoje ? "atrasado" : "avencer";
}

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
function fmtDt(iso: string) {
  const [, m, d] = iso.split("T")[0].split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
function isoParaDate(iso: string | null) {
  if (!iso) return "";
  return iso.split("T")[0]; // "YYYY-MM-DD"
}
function ultimoDiaMes(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate(); // 0 = último dia do mês anterior
}
function dataVencimentoPadrao(mes: number, ano: number) {
  const dia = ultimoDiaMes(mes, ano);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function PagamentosClient({
  pagamentosIniciais, mesInicial, anoInicial, isAdmin, podeNovo, alunoFiltro,
}: {
  pagamentosIniciais: PagamentoItem[];
  mesInicial:         number;
  anoInicial:         number;
  isAdmin:            boolean;
  podeNovo?:          boolean;
  alunoFiltro?:       string | null;
}) {
  const [mes,        setMes]        = useState(mesInicial);
  const [ano,        setAno]        = useState(anoInicial);
  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>(pagamentosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [gerando,    setGerando]    = useState(false);
  const [resultadoGerar, setResultadoGerar] = useState<{ criadas: number; existentes: number } | null>(null);
  const [marcando,      setMarcando]      = useState<string | null>(null);
  const [erroBaixa,     setErroBaixa]     = useState<string | null>(null);
  const [enviandoEmail, setEnviandoEmail] = useState<string | null>(null);
  const [emailMsg,      setEmailMsg]      = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [emailModal,    setEmailModal]    = useState<PagamentoItem | null>(null);
  const [obsModal,   setObsModal]   = useState<{ id: string; obs: string } | null>(null);
  const [aulasModal, setAulasModal] = useState<{
    id: string; alunoNome: string; valorCobranca: number;
    qtd: string; aulasRegistradas: number;
  } | null>(null);

  // ── Estados CRUD ─────────────────────────────────────────────────────────
  const [formPag,         setFormPag]         = useState<FormPag | null>(null);
  const [alunosLista,     setAlunosLista]      = useState<AlunoSimples[]>([]);
  const [carregandoAluno, setCarregandoAluno]  = useState(false);
  const [aulasRealizadas, setAulasRealizadas]  = useState<AulaRealizada[]>([]);
  const [aulasSelecionadas, setAulasSelecionadas] = useState<string[]>([]);
  const [carregandoAulas, setCarregandoAulas]  = useState(false);
  const [salvando,        setSalvando]         = useState(false);
  const [excluirId,       setExcluirId]        = useState<string | null>(null);
  const [excluindo,       setExcluindo]        = useState(false);
  const [erroExcluir,     setErroExcluir]      = useState<string | null>(null);
  const [erroCrud,        setErroCrud]         = useState<string | null>(null);

  // ── Busca registros para um mês ─────────────────────────────────────────
  const buscarPagamentos = useCallback(async (m: number, a: number) => {
    const url = `/api/pagamentos?mes=${m}&ano=${a}${alunoFiltro ? `&aluno=${alunoFiltro}` : ""}`;
    const res  = await fetch(url);
    return res.json() as Promise<PagamentoItem[]>;
  }, [alunoFiltro]);

  // ── Gerar cobranças do mês no servidor ──────────────────────────────────
  const gerarCobranças = useCallback(async (m: number, a: number) => {
    const res = await fetch("/api/pagamentos/gerar", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ mes: m, ano: a }),
    });
    return res.json() as Promise<{ criadas: number; existentes: number }>;
  }, []);

  // ── Navegação de mês ────────────────────────────────────────────────────
  const navMes = useCallback(async (delta: number) => {
    let nm = mes + delta, na = ano;
    if (nm > 12) { nm = 1; na++; }
    if (nm < 1)  { nm = 12; na--; }
    setMes(nm); setAno(na);
    setCarregando(true);
    const data = await buscarPagamentos(nm, na);
    setPagamentos(data);
    setCarregando(false);
  }, [mes, ano, buscarPagamentos]);

  // ── Gerar cobranças manualmente ─────────────────────────────────────────
  const handleGerar = useCallback(async () => {
    setGerando(true);
    const resultado = await gerarCobranças(mes, ano);
    const data = await buscarPagamentos(mes, ano);
    setPagamentos(data);
    setResultadoGerar(resultado);
    setGerando(false);
  }, [mes, ano, gerarCobranças, buscarPagamentos]);

  // ── Marcar/desmarcar pago ────────────────────────────────────────────────
  async function togglePago(item: PagamentoItem) {
    setMarcando(item.id);
    setErroBaixa(null);
    const novoPago = !item.pago;
    const res = await fetch(`/api/pagamentos/${item.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pago: novoPago }),
    });
    if (res.ok) {
      const pg = await res.json();
      setPagamentos((prev) => prev.map((p) =>
        p.id === item.id
          ? { ...p, pago: pg.pago, dataPagamento: pg.dataPagamento ?? null }
          : p,
      ));
    } else {
      const data = await res.json();
      if (data.erro) setErroBaixa(data.erro);
    }
    setMarcando(null);
  }

  // ── Enviar e-mail ao responsável ─────────────────────────────────────────
  async function enviarEmail(item: PagamentoItem, tipo: "atraso" | "lembrete" | "recibo") {
    setEnviandoEmail(item.id);
    setEmailModal(null);
    try {
      const res  = await fetch("/api/email/pagamento", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pagamentoId: item.id, tipo }),
      });
      const data = await res.json();
      if (res.ok) {
        setPagamentos((prev) => prev.map((p) =>
          p.id === item.id
            ? { ...p, emailTipo: data.emailTipo, emailEnviadoEm: data.emailEnviadoEm }
            : p,
        ));
      }
      setEmailMsg({
        id:  item.id,
        ok:  res.ok,
        msg: res.ok ? "E-mail enviado com sucesso!" : (data.erro ?? "Erro ao enviar e-mail."),
      });
      setTimeout(() => setEmailMsg(null), 5000);
    } finally {
      setEnviandoEmail(null);
    }
  }

  // ── Salvar observação ────────────────────────────────────────────────────
  async function salvarObs() {
    if (!obsModal) return;
    const res = await fetch(`/api/pagamentos/${obsModal.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ observacao: obsModal.obs }),
    });
    if (res.ok) {
      setPagamentos((prev) => prev.map((p) =>
        p.id === obsModal.id ? { ...p, observacao: obsModal.obs } : p,
      ));
    }
    setObsModal(null);
  }

  // ── Salvar qtd aulas (POR_AULA) ──────────────────────────────────────────
  async function salvarAulas() {
    if (!aulasModal) return;
    const qtd   = parseInt(aulasModal.qtd) || 0;
    const valor = qtd * aulasModal.valorCobranca;
    const res = await fetch(`/api/pagamentos/${aulasModal.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ quantidadeAulas: qtd, valorCobrado: valor }),
    });
    if (res.ok) {
      setPagamentos((prev) => prev.map((p) =>
        p.id === aulasModal.id ? { ...p, quantidadeAulas: qtd, valorCobrado: valor } : p,
      ));
    }
    setAulasModal(null);
  }

  async function carregarAulasRealizadas(alunoId: string) {
    if (!alunoId) { setAulasRealizadas([]); setAulasSelecionadas([]); return; }
    setCarregandoAulas(true);
    try {
      const res = await fetch(`/api/agenda/realizadas?alunoId=${alunoId}`);
      if (res.ok) setAulasRealizadas(await res.json());
    } finally {
      setCarregandoAulas(false);
    }
    setAulasSelecionadas([]);
  }

  // ── CRUD: abrir modal criar ───────────────────────────────────────────────
  async function abrirCriar() {
    setErroCrud(null);
    setCarregandoAluno(true);
    setAulasRealizadas([]);
    setAulasSelecionadas([]);
    setFormPag({
      modo: "criar", alunoId: "", parcela: "1",
      dataVencimento: dataVencimentoPadrao(mes, ano),
      valorCobrado: "", quantidadeAulas: "",
      pago: false, dataPagamento: "", observacao: "",
    });
    const res  = await fetch("/api/alunos");
    const data = await res.json();
    setAlunosLista(data.map((a: any) => ({
      id:            a.id,
      nome:          a.nome,
      tipoCobranca:  a.tipoCobranca  ?? null,
      valorCobranca: a.valorCobranca ?? null,
      professora:    a.professora?.usuario?.nome ?? null,
      unidade:       { nome: a.unidade?.nome ?? "", escola: { nome: a.unidade?.escola?.nome ?? "" } },
    })));
    setCarregandoAluno(false);
  }

  // ── CRUD: abrir modal editar ──────────────────────────────────────────────
  function abrirEditar(item: PagamentoItem) {
    setErroCrud(null);
    setFormPag({
      modo:           "editar",
      id:             item.id,
      alunoId:        item.alunoId,
      parcela:        String(item.parcela),
      dataVencimento: isoParaDate(item.dataVencimento),
      valorCobrado:   String(item.valorCobrado),
      quantidadeAulas: item.quantidadeAulas !== null ? String(item.quantidadeAulas) : "",
      pago:           item.pago,
      dataPagamento:  isoParaDate(item.dataPagamento),
      observacao:     item.observacao ?? "",
    });
  }

  // ── CRUD: salvar (criar ou editar) ────────────────────────────────────────
  async function salvarForm() {
    if (!formPag) return;
    setSalvando(true);
    setErroCrud(null);
    try {
      const valorNum = parseFloat(formPag.valorCobrado.replace(",", ".")) || 0;
      const qtdNum   = formPag.quantidadeAulas ? parseInt(formPag.quantidadeAulas) : null;

      if (formPag.modo === "criar") {
        if (!formPag.alunoId) { setErroCrud("Selecione o aluno."); return; }
        if (!formPag.dataVencimento) { setErroCrud("Informe a data de vencimento."); return; }
        const body = {
          alunoId:         formPag.alunoId,
          mes, ano,
          parcela:         parseInt(formPag.parcela) || 1,
          dataVencimento:  formPag.dataVencimento,
          valorCobrado:    valorNum,
          quantidadeAulas: qtdNum,
          pago:            formPag.pago,
          dataPagamento:   formPag.pago && formPag.dataPagamento ? formPag.dataPagamento : null,
          observacao:      formPag.observacao || null,
          aulaIds:         aulasSelecionadas,
        };
        const res = await fetch("/api/pagamentos", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          setErroCrud(err.erro ?? "Erro ao criar pagamento.");
          return;
        }
      } else {
        const body: any = {
          dataVencimento:  formPag.dataVencimento || undefined,
          valorCobrado:    valorNum,
          quantidadeAulas: qtdNum,
          pago:            formPag.pago,
          dataPagamento:   formPag.pago
            ? (formPag.dataPagamento || new Date().toISOString().split("T")[0])
            : null,
          observacao: formPag.observacao || null,
        };
        const res = await fetch(`/api/pagamentos/${formPag.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          setErroCrud(err.erro ?? "Erro ao atualizar pagamento.");
          return;
        }
      }

      // Recarrega lista
      const data = await buscarPagamentos(mes, ano);
      setPagamentos(data);
      setFormPag(null);
    } finally {
      setSalvando(false);
    }
  }

  // ── CRUD: excluir ─────────────────────────────────────────────────────────
  async function confirmarExclusao() {
    if (!excluirId) return;
    setExcluindo(true);
    setErroExcluir(null);
    const res = await fetch(`/api/pagamentos/${excluirId}`, { method: "DELETE" });
    if (res.ok) {
      setPagamentos((prev) => prev.filter((p) => p.id !== excluirId));
      setExcluirId(null);
    } else {
      const data = await res.json();
      setErroExcluir(data.erro ?? "Erro ao excluir pagamento.");
    }
    setExcluindo(false);
  }

  // ── Resumo ───────────────────────────────────────────────────────────────
  const totalEsperado = pagamentos.reduce((s, p) => s + p.valorCobrado, 0);
  const totalRecebido = pagamentos.filter((p) => p.pago).reduce((s, p) => s + p.valorCobrado, 0);
  const totalPendente = totalEsperado - totalRecebido;
  const qtdAtrasados  = pagamentos.filter((p) => status(p) === "atrasado").length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Banner filtro por aluno */}
      {alunoFiltro && pagamentosIniciais.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-indigo-600" />
            <p className="text-sm font-medium text-indigo-800">
              Exibindo pagamentos de: <strong>{pagamentosIniciais[0].aluno.nome}</strong>
            </p>
          </div>
          <Link
            href="/dashboard/pagamentos"
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <ArrowLeft size={13} />
            Ver todos
          </Link>
        </div>
      )}

      {/* Navegação de mês */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <button onClick={() => navMes(-1)} disabled={carregando}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40">
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-slate-800 text-lg">{MESES[mes - 1]} {ano}</p>
          <p className="text-xs text-slate-400">{pagamentos.length} parcela(s)</p>
        </div>
        <button onClick={() => navMes(1)} disabled={carregando}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40">
          <ChevronRight size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-slate-500" />
            <p className="text-xs font-medium text-slate-500">Total esperado</p>
          </div>
          <p className="text-lg font-bold text-slate-800">{moeda(totalEsperado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <p className="text-xs font-medium text-emerald-600">Recebido</p>
          </div>
          <p className="text-lg font-bold text-emerald-700">{moeda(totalRecebido)}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-amber-500" />
            <p className="text-xs font-medium text-amber-600">Pendente</p>
          </div>
          <p className="text-lg font-bold text-amber-700">{moeda(totalPendente)}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-red-500" />
            <p className="text-xs font-medium text-red-600">Atrasados</p>
          </div>
          <p className="text-lg font-bold text-red-700">{qtdAtrasados}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-medium text-slate-500">
            {pagamentos.length === 0
              ? "Nenhuma cobrança gerada para este mês"
              : `${pagamentos.length} cobrança(s)`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGerar}
              disabled={gerando || carregando}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={13} className={gerando ? "animate-spin" : ""} />
              {gerando ? "Gerando…" : "Gerar cobranças"}
            </button>
            {(isAdmin || podeNovo) && (
              <>
                <div className="w-px h-4 bg-slate-300" />
                <button
                  onClick={abrirCriar}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={13} />
                  Novo
                </button>
              </>
            )}
          </div>
        </div>

        {pagamentos.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            Clique em <strong>Gerar cobranças</strong> para criar os registros deste mês,
            ou em <strong>Novo</strong> para adicionar manualmente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Aluno</th>
                  {isAdmin && <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Professor</th>}
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Vencimento</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Pago em</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagamentos.map((item) => {
                  const st      = status(item);
                  const loading = marcando === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      {/* Aluno */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.aluno.nome}</p>
                        <p className="text-xs text-slate-400">
                          {item.aluno.unidade.escola.nome} · {item.aluno.unidade.nome}
                        </p>
                      </td>

                      {/* Professor (admin) */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {item.aluno.professora ?? "—"}
                        </td>
                      )}

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">
                          {TIPO_LABEL[item.aluno.tipoCobranca] ?? item.aluno.tipoCobranca}
                        </span>
                        {item.aluno.tipoCobranca === "QUINZENAL" && (
                          <span className="text-xs text-slate-400 ml-1">({item.parcela}ª)</span>
                        )}
                        {item.aluno.tipoCobranca === "SEMANAL" && (
                          <span className="text-xs text-slate-400 ml-1">(sem. {item.parcela})</span>
                        )}
                        {item.aluno.tipoCobranca === "POR_AULA" && (
                          <button
                            onClick={() => setAulasModal({
                              id:               item.id,
                              alunoNome:        item.aluno.nome,
                              valorCobranca:    item.aluno.valorCobranca,
                              qtd:              String(item.quantidadeAulas ?? 0),
                              aulasRegistradas: item.quantidadeAulas ?? 0,
                            })}
                            className="block text-xs text-indigo-500 hover:underline mt-0.5"
                          >
                            {item.quantidadeAulas ?? 0} aula(s)
                          </button>
                        )}
                      </td>

                      {/* Vencimento */}
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {fmtDt(item.dataVencimento)}
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {moeda(item.valorCobrado)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {st === "pago"     && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"><CheckCircle2 size={12} /> Pago</span>}
                        {st === "avencer"  && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"><Clock size={12} /> A vencer</span>}
                        {st === "atrasado" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium"><AlertCircle size={12} /> Atrasado</span>}
                      </td>

                      {/* Pago em */}
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {fmtData(item.dataPagamento)}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Marcar pago */}
                          <button
                            onClick={() => togglePago(item)}
                            disabled={loading}
                            title={item.pago ? "Desmarcar" : "Marcar como pago"}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${
                              item.pago
                                ? "bg-emerald-100 hover:bg-red-100 text-emerald-700 hover:text-red-600"
                                : "bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700"
                            }`}
                          >
                            {loading
                              ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : item.pago ? <X size={14} /> : <Check size={14} />
                            }
                          </button>

                          {/* Observação */}
                          <button
                            onClick={() => setObsModal({ id: item.id, obs: item.observacao ?? "" })}
                            title="Observação"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              item.observacao
                                ? "bg-red-100 text-red-600 hover:bg-red-200"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            <MessageSquare size={13} />
                          </button>

                          {/* E-mail ao responsável */}
                          {item.aluno.emailResponsavel && (() => {
                            const corEmail =
                              item.emailTipo === "atraso"   ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-300 ring-2 ring-orange-400" :
                              item.emailTipo === "recibo"   ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-300 ring-2 ring-emerald-400" :
                              item.emailTipo === "lembrete" ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-300 ring-2 ring-blue-400" :
                              "bg-slate-100 hover:bg-slate-200 text-slate-500";

                            const dataEnvio = item.emailEnviadoEm
                              ? new Date(item.emailEnviadoEm).toLocaleDateString("pt-BR", {
                                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                                })
                              : null;

                            const titleEmail = dataEnvio
                              ? `Último e-mail: ${item.emailTipo} em ${dataEnvio} · Clique para enviar outro`
                              : `Enviar e-mail para ${item.aluno.emailResponsavel}`;

                            return (
                              <button
                                onClick={() => setEmailModal(item)}
                                disabled={enviandoEmail === item.id}
                                title={titleEmail}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${corEmail}`}
                              >
                                {enviandoEmail === item.id
                                  ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  : <Mail size={13} />
                                }
                              </button>
                            );
                          })()}

                          {/* Editar */}
                          <button
                            onClick={() => abrirEditar(item)}
                            title="Editar"
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => setExcluirId(item.id)}
                            title="Excluir"
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {emailMsg?.id === item.id && (
                          <p className={`text-xs mt-1 text-center ${emailMsg.ok ? "text-emerald-600" : "text-red-600"}`}>
                            {emailMsg.msg}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Criar / Editar ─────────────────────────────────────────────── */}
      {formPag && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {formPag.modo === "criar" ? "Novo Pagamento" : "Editar Pagamento"}
              </h2>
              <button onClick={() => setFormPag(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Mês/Ano — informativo */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 text-xs text-indigo-700 font-medium">
                Competência: {MESES[mes - 1]} / {ano}
              </div>

              {/* Aluno */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Aluno <span className="text-red-500">*</span>
                </label>
                {formPag.modo === "criar" ? (
                  carregandoAluno ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Carregando alunos…
                    </div>
                  ) : (() => {
                    const alunoSel = alunosLista.find((a) => a.id === formPag.alunoId);
                    return (
                      <>
                        <select
                          value={formPag.alunoId}
                          onChange={(e) => {
                            const aluno = alunosLista.find((a) => a.id === e.target.value);
                            setFormPag((f) => f ? {
                              ...f,
                              alunoId:      e.target.value,
                              valorCobrado: aluno?.valorCobranca != null ? String(aluno.valorCobranca) : f.valorCobrado,
                            } : f);
                            carregarAulasRealizadas(e.target.value);
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Selecione um aluno…</option>
                          {alunosLista.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nome} — {a.unidade.escola.nome} · {a.unidade.nome}
                            </option>
                          ))}
                        </select>
                        {alunoSel && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="text-slate-400">Professor:</span>
                            <span className="font-medium text-slate-700">
                              {alunoSel.professora ?? "—"}
                            </span>
                            {alunoSel.tipoCobranca && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-slate-500">
                                  {TIPO_LABEL[alunoSel.tipoCobranca] ?? alunoSel.tipoCobranca}
                                  {alunoSel.valorCobranca != null && (
                                    <span className="ml-1 text-indigo-600 font-medium">
                                      {moeda(alunoSel.valorCobranca)}
                                    </span>
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  <p className="text-sm font-medium text-slate-700 border border-slate-100 bg-slate-50 rounded-lg px-3 py-2">
                    {pagamentos.find((p) => p.id === formPag.id)?.aluno.nome ?? "—"}
                  </p>
                )}
              </div>

              {/* Parcela + Data vencimento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parcela</label>
                  <input
                    type="number" min={1}
                    value={formPag.parcela}
                    onChange={(e) => setFormPag((f) => f ? { ...f, parcela: e.target.value } : f)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Vencimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formPag.dataVencimento}
                    onChange={(e) => setFormPag((f) => f ? { ...f, dataVencimento: e.target.value } : f)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Valor + Qtd aulas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Valor cobrado (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min={0} step="0.01"
                    value={formPag.valorCobrado}
                    onChange={(e) => setFormPag((f) => f ? { ...f, valorCobrado: e.target.value } : f)}
                    placeholder="0,00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qtd. aulas</label>
                  <input
                    type="number" min={0}
                    value={formPag.quantidadeAulas}
                    onChange={(e) => setFormPag((f) => f ? { ...f, quantidadeAulas: e.target.value } : f)}
                    placeholder="Opcional"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Pago */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPag.pago}
                    onChange={(e) => setFormPag((f) => f ? {
                      ...f,
                      pago: e.target.checked,
                      dataPagamento: e.target.checked
                        ? (f.dataPagamento || new Date().toISOString().split("T")[0])
                        : "",
                    } : f)}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">Marcar como pago</span>
                </label>
              </div>

              {/* Data pagamento */}
              {formPag.pago && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data do pagamento</label>
                  <input
                    type="date"
                    value={formPag.dataPagamento}
                    onChange={(e) => setFormPag((f) => f ? { ...f, dataPagamento: e.target.value } : f)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Aulas Realizadas — apenas no modo criar */}
              {formPag.modo === "criar" && formPag.alunoId && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Vincular Aulas Agendadas Realizadas
                    {aulasRealizadas.length > 0 && (
                      <span className="ml-1 text-slate-400 font-normal">({aulasRealizadas.length} disponíveis)</span>
                    )}
                  </label>
                  {carregandoAulas ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Carregando aulas…
                    </div>
                  ) : aulasRealizadas.length === 0 ? (
                    <p className="text-xs text-slate-400 py-1">Nenhuma Aula Agendada Realizada sem pagamento vinculado.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-36 overflow-y-auto">
                      {aulasRealizadas.map((a) => {
                        const sel = aulasSelecionadas.includes(a.id);
                        const d = new Date(a.data);
                        const dataFmt = `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`;
                        return (
                          <label key={a.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 ${sel ? "bg-indigo-50" : ""}`}>
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={() => setAulasSelecionadas((prev) =>
                                sel ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                              )}
                              className="accent-indigo-600"
                            />
                            <span className="text-xs text-slate-700">
                              {dataFmt}
                              {a.horaInicio && <span className="text-slate-400"> · {a.horaInicio}{a.horaFim ? `–${a.horaFim}` : ""}</span>}
                              {a.materia && <span className="text-indigo-600 ml-1">· {a.materia}</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Observação */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observação</label>
                <textarea
                  value={formPag.observacao}
                  onChange={(e) => setFormPag((f) => f ? { ...f, observacao: e.target.value } : f)}
                  rows={2}
                  placeholder="Ex: Pagamento antecipado, desconto aplicado…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Erro */}
              {erroCrud && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {erroCrud}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={salvarForm}
                disabled={salvando}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {salvando
                  ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando…</>
                  : formPag.modo === "criar" ? "Criar pagamento" : "Salvar alterações"
                }
              </button>
              <button
                onClick={() => setFormPag(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ─────────────────────────────────────────── */}
      {excluirId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Excluir pagamento</h2>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Tem certeza que deseja excluir este registro de pagamento de{" "}
              <strong>{pagamentos.find((p) => p.id === excluirId)?.aluno.nome}</strong>?
            </p>

            {/* Erro de regra de negócio */}
            {erroExcluir && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">{erroExcluir}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!erroExcluir && (
                <button
                  onClick={confirmarExclusao}
                  disabled={excluindo}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {excluindo
                    ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Excluindo…</>
                    : "Sim, excluir"
                  }
                </button>
              )}
              <button
                onClick={() => { setExcluirId(null); setErroExcluir(null); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {erroExcluir ? "Fechar" : "Cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Erro Baixa ─────────────────────────────────────────────────── */}
      {erroBaixa && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Baixa não permitida</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">{erroBaixa}</p>
            <button
              onClick={() => setErroBaixa(null)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Resultado Geração ──────────────────────────────────────────── */}
      {resultadoGerar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                resultadoGerar.criadas > 0 ? "bg-emerald-100" : "bg-amber-100"
              }`}>
                {resultadoGerar.criadas > 0
                  ? <CheckCircle2 size={20} className="text-emerald-600" />
                  : <AlertCircle  size={20} className="text-amber-600"   />
                }
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Resultado da geração</h2>
                <p className="text-xs text-slate-500">{MESES[mes - 1]} / {ano}</p>
              </div>
            </div>

            {resultadoGerar.criadas === 0 && resultadoGerar.existentes === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm font-medium text-amber-800 mb-1">Nenhuma cobrança gerada</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Não foram encontradas aulas com status <strong>Realizada</strong> ou <strong>Falta do aluno</strong>
                  {" "}neste mês. Lance as aulas na agenda antes de gerar cobranças.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {resultadoGerar.criadas > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <p className="text-sm text-emerald-800">
                      <strong>{resultadoGerar.criadas}</strong> cobrança(s) criada(s) com sucesso
                    </p>
                  </div>
                )}
                {resultadoGerar.existentes > 0 && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <Clock size={14} className="text-slate-500 shrink-0" />
                    <p className="text-sm text-slate-600">
                      <strong>{resultadoGerar.existentes}</strong> cobrança(s) já existiam e foram mantidas
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setResultadoGerar(null)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal E-mail ─────────────────────────────────────────────────────── */}
      {emailModal && (() => {
        const st = status(emailModal);
        const tipoSugerido: "atraso" | "lembrete" | "recibo" =
          st === "atrasado" ? "atraso" : st === "pago" ? "recibo" : "lembrete";

        const opcoes: { tipo: "atraso" | "lembrete" | "recibo"; label: string; desc: string; cor: string }[] = [
          {
            tipo: "lembrete",
            label: "📅 Lembrete de vencimento",
            desc: "Avisa que o pagamento está próximo do vencimento",
            cor: "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800",
          },
          {
            tipo: "atraso",
            label: "⚠️ Aviso de atraso",
            desc: "Informa que o pagamento está em atraso",
            cor: "border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800",
          },
          {
            tipo: "recibo",
            label: "✅ Confirmação de pagamento",
            desc: "Envia recibo confirmando que o pagamento foi recebido",
            cor: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800",
          },
        ];

        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <Send size={16} className="text-indigo-600" />
                <h2 className="text-base font-bold text-slate-800">Enviar e-mail</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Para: <strong>{emailModal.aluno.emailResponsavel}</strong>
                <span className="text-slate-400 ml-1">({emailModal.aluno.nome})</span>
              </p>

              <div className="space-y-2 mb-5">
                {opcoes.map((op) => (
                  <button
                    key={op.tipo}
                    onClick={() => enviarEmail(emailModal, op.tipo)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${op.cor} ${
                      op.tipo === tipoSugerido ? "ring-2 ring-offset-1 ring-indigo-400" : ""
                    }`}
                  >
                    {op.label}
                    {op.tipo === tipoSugerido && (
                      <span className="ml-2 text-xs font-normal opacity-70">(sugerido)</span>
                    )}
                    <p className="text-xs font-normal opacity-70 mt-0.5">{op.desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setEmailModal(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Modal Observação ─────────────────────────────────────────────────── */}
      {obsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-bold text-slate-800 mb-3">Observação do pagamento</h2>
            <textarea
              value={obsModal.obs}
              onChange={(e) => setObsModal({ ...obsModal, obs: e.target.value })}
              rows={4} placeholder="Ex: Pagou com cheque, aguardando compensação..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={salvarObs}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                Salvar
              </button>
              <button onClick={() => setObsModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Qtd Aulas (POR_AULA) ───────────────────────────────────────── */}
      {aulasModal && (() => {
        const qtd = parseInt(aulasModal.qtd) || 0;
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h2 className="text-base font-bold text-slate-800 mb-1">
                Aulas dadas — {aulasModal.alunoNome}
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Valor por aula: {moeda(aulasModal.valorCobranca)} · Registradas: {aulasModal.aulasRegistradas}
              </p>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Quantidade de aulas no mês
              </label>
              <input
                type="number" min={0} value={aulasModal.qtd}
                onChange={(e) => setAulasModal({ ...aulasModal, qtd: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />
              <p className="text-sm font-semibold text-indigo-700 mb-4">
                Total: {moeda(qtd * aulasModal.valorCobranca)}
              </p>
              <div className="flex gap-3">
                <button onClick={salvarAulas}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                  Salvar
                </button>
                <button onClick={() => setAulasModal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

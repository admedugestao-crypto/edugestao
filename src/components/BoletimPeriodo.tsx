"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./BoletimPeriodo.module.css";
import { PERIODOS_ESCOLARES } from "@/lib/periodosAvaliacao";

type Aluno = { id: string; nome: string; serie: string; turma: string | null; unidade: { nome: string; escola: { nome: string; periodoAvaliacao: string | null } }; materias: { materia: { id: string; nome: string } }[] };
type Nota = { materiaId: string; periodo: number; valor: number };

export default function BoletimPeriodo({ alunos, anoInicial }: { alunos: Aluno[]; anoInicial: number }) {
  const paginaRef = useRef<HTMLElement>(null);
  const [alunoId, setAlunoId] = useState("");
  const [ano, setAno] = useState(anoInicial);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const aluno = alunos.find((a) => a.id === alunoId);
  const tipo = aluno?.unidade.escola.periodoAvaliacao ?? "";
  const periodos = PERIODOS_ESCOLARES[tipo] ?? [];

  useEffect(() => {
    const controller = new AbortController();
    if (!alunoId) return () => controller.abort();
    fetch(`/api/notas-periodo?alunoId=${encodeURIComponent(alunoId)}&ano=${ano}`, { signal: controller.signal })
      .then(async (res) => { const dados = await res.json(); if (!res.ok) throw new Error(dados.erro ?? "Não foi possível carregar as notas."); return dados as Nota[]; })
      .then((notas) => setValores(Object.fromEntries(notas.map((n) => [`${n.materiaId}:${n.periodo}`, String(n.valor)]))))
      .catch((e: Error) => { if (!controller.signal.aborted) setErro(e.message); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [alunoId, ano]);

  useEffect(() => {
    const avisar = (event: BeforeUnloadEvent) => { if (alterado) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alterado]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const atualizarAltura = () => paginaRef.current?.style.setProperty("--altura-visivel", `${viewport.height}px`);
    atualizarAltura();
    viewport.addEventListener("resize", atualizarAltura);
    return () => viewport.removeEventListener("resize", atualizarAltura);
  }, []);

  function podeTrocar() { return !alterado || window.confirm("Existem notas não salvas. Deseja descartá-las e trocar a seleção?"); }
  function prepararTroca() { setValores({}); setErro(""); setMensagem(""); setAlterado(false); setCarregando(true); }
  async function salvar() {
    if (!aluno || !periodos.length) return;
    const notas: Nota[] = [];
    for (const { materia } of aluno.materias) {
      for (let periodo = 0; periodo <= periodos.length; periodo++) {
        const texto = valores[`${materia.id}:${periodo}`]?.trim();
        if (!texto) continue;
        const valor = Number(texto.replace(",", "."));
        if (!Number.isFinite(valor) || valor < 0 || valor > 10) { setErro("Preencha notas entre 0 e 10."); return; }
        notas.push({ materiaId: materia.id, periodo, valor });
      }
    }
    setSalvando(true); setErro(""); setMensagem("");
    try {
      const res = await fetch("/api/notas-periodo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alunoId, ano, tipoPeriodo: tipo, notas }) });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro ?? "Não foi possível salvar.");
      setAlterado(false); setMensagem("Notas salvas com sucesso.");
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  }

  return <section ref={paginaRef} className={styles.pagina}>
    <header><p className="text-sm font-bold uppercase text-blue-600">Acompanhamento escolar</p><h1 className="text-3xl font-bold">Avaliações — planilha de notas</h1><p className="mt-2 text-slate-500">Notas por disciplina e período de avaliação da escola.</p></header>
    <div className="flex flex-wrap gap-4 print:hidden">
      <label className="min-w-60 flex-1">Aluno<select className="mt-1 w-full rounded-xl border bg-white p-3" value={alunoId} disabled={salvando} onChange={(e) => { if (podeTrocar()) { prepararTroca(); setCarregando(!!e.target.value); setAlunoId(e.target.value); } }}><option value="">Selecione um aluno</option>{alunos.map((a) => <option key={a.id} value={a.id}>{a.nome} — {a.serie}</option>)}</select></label>
      <label>Ano letivo<select className="mt-1 block rounded-xl border bg-white p-3" value={ano} disabled={salvando} onChange={(e) => { if (podeTrocar()) { prepararTroca(); setCarregando(!!alunoId); setAno(Number(e.target.value)); } }}>{Array.from({ length: 12 }, (_, i) => anoInicial - 5 + i).map((a) => <option key={a}>{a}</option>)}</select></label>
    </div>
    {!alunos.length && <p>Nenhum aluno ativo disponível.</p>}
    {erro && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{erro}</p>}
    {mensagem && <p role="status" className="text-green-700">{mensagem}</p>}
    {carregando ? <p role="status">Carregando notas...</p> : aluno && <div className={styles.cartao}>
      <h2 className="text-xl font-bold">{aluno.nome}</h2><p>{aluno.unidade.escola.nome} · {aluno.unidade.nome}</p><p className="text-slate-500">{aluno.serie}{aluno.turma ? ` · Turma ${aluno.turma}` : ""} · {ano} · {tipo || "Período não definido"}</p>
      {!periodos.length ? <p className="mt-4">Defina o período de avaliação no cadastro da escola para montar a planilha.</p> : !aluno.materias.length ? <p className="mt-4">Adicione disciplinas no cadastro do aluno para montar a planilha.</p> : <>
        <div className={styles.planilha}><table className="w-full border-collapse text-sm"><caption className="sr-only">Notas de {aluno.nome} no ano {ano}</caption><thead className={styles.cabecalhoTabela}><tr className="bg-slate-50"><th scope="col" className="border p-3 text-left">Disciplina</th>{[...periodos, "Recuperação", "Média"].map((p) => <th scope="col" className="border p-3" key={p}>{p}</th>)}</tr></thead><tbody>{aluno.materias.map(({ materia }) => {
          const preenchidas = periodos.map((_, i) => valores[`${materia.id}:${i + 1}`]).filter((v) => v?.trim()).map((v) => Number(v.replace(",", "."))).filter((v) => Number.isFinite(v) && v >= 0 && v <= 10);
          const media = preenchidas.length ? (preenchidas.reduce((a, b) => a + b, 0) / preenchidas.length).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";
          return <tr key={materia.id}><th scope="row" className="border p-3 text-left">{materia.nome}</th>{[...periodos.map((_, i) => i + 1), 0].map((p) => <td key={p} className="border p-2"><input type="text" inputMode="decimal" className="w-20 rounded-lg border p-2 text-center" aria-label={`${materia.nome} — ${p === 0 ? "Recuperação" : periodos[p - 1]}`} value={valores[`${materia.id}:${p}`] ?? ""} disabled={salvando || !!erro && !alterado} onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })} onChange={(e) => { setValores((v) => ({ ...v, [`${materia.id}:${p}`]: e.target.value })); setAlterado(true); setMensagem(""); }} /></td>)}<td className="border p-3 text-center font-bold">{media}</td></tr>;
        })}</tbody></table></div>
        <p className={`${styles.orientacao} mt-3 text-sm text-slate-500`}>Escala de 0 a 10. A média considera os períodos preenchidos; recuperação é registrada separadamente. Deixe o campo vazio para remover uma nota.</p>
        <div className="mt-5 flex gap-3 print:hidden"><button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50" disabled={salvando || !alterado} onClick={salvar}>{salvando ? "Salvando..." : "Salvar notas"}</button><button className="rounded-xl border px-5 py-3" onClick={() => window.print()}>Imprimir</button></div>
      </>}
    </div>}
  </section>;
}

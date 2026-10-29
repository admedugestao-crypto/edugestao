"use client";

import { useEffect, useState } from "react";

type Inscricao = {
  id: string; nome: string; email: string; whatsapp: string; materias: string;
  quantidadeAlunos: number; organizacao: string; dificuldade: string;
  disponibilidade: boolean; contatadoEm: string | null; criadoEm: string;
};

export default function InscricoesTestePage() {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/plataforma/inscricoes-teste?pagina=${pagina}`, { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error("Não foi possível carregar as inscrições."); return r.json(); })
      .then((dados) => { setInscricoes(dados.inscricoes); setTotal(dados.total); })
      .catch((e) => { if (!controller.signal.aborted) setErro(e.message); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [pagina]);

  function mudarPagina(valor: number) {
    setCarregando(true);
    setErro("");
    setPagina(valor);
  }

  async function marcar(inscricao: Inscricao) {
    setSalvando(inscricao.id); setErro("");
    try {
      const r = await fetch("/api/plataforma/inscricoes-teste", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inscricao.id, contatado: !inscricao.contatadoEm }) });
      if (!r.ok) throw new Error("Não foi possível atualizar o contato. Tente novamente.");
      setInscricoes((lista) => lista.map((item) => item.id === inscricao.id ? { ...item, contatadoEm: item.contatadoEm ? null : new Date().toISOString() } : item));
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha de conexão."); }
    finally { setSalvando(null); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><h1 className="text-2xl font-bold text-slate-900">Inscrições para o teste EG V2</h1><p className="mt-2 text-slate-600">{total} inscrições. Todos devem receber contato pelo WhatsApp. A seleção contempla 5 professores para 60 dias de teste gratuito e mais 12 meses gratuitos, contados a partir do lançamento oficial.</p><p className="mt-2 text-sm text-slate-600">Durante o teste, os participantes usarão o EG V2, reportarão problemas ao suporte do app e compartilharão sugestões de melhoria. Ao aprovar um participante, informe o aceite e envie as instruções para começar. A marcação de contato realizado registra o atendimento, não a aprovação.</p><a href="/inscricao" target="_blank" rel="noreferrer" className="mt-3 inline-block text-indigo-700 underline">Abrir página pública de inscrição</a></header>
      {erro && <p role="alert" className="rounded bg-red-50 p-4 text-red-700">{erro}</p>}
      {carregando ? <p role="status">Carregando inscrições...</p> : !erro && !inscricoes.length ? <p className="rounded-xl bg-white p-6 text-slate-600">As novas inscrições aparecerão aqui.</p> : <div className="space-y-4">{inscricoes.map((i) => (
        <article key={i.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{i.nome}</h2><p className="text-sm text-slate-500">{new Date(i.criadoEm).toLocaleString("pt-BR")} · {i.contatadoEm ? "Contato realizado" : "Aguardando contato"}</p></div>
            <div className="flex flex-wrap gap-2"><a href={`https://wa.me/55${i.whatsapp}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">Abrir WhatsApp</a><button disabled={salvando !== null} onClick={() => marcar(i)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">{salvando === i.id ? "Salvando..." : i.contatadoEm ? "Marcar como pendente" : "Marcar contato realizado"}</button></div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Contato</dt><dd className="break-words">{i.whatsapp}<br />{i.email}</dd></div><div><dt className="font-semibold">Atuação</dt><dd>{i.materias} · {i.quantidadeAlunos} alunos</dd></div>
            <div><dt className="font-semibold">Organização atual</dt><dd className="whitespace-pre-wrap break-words">{i.organizacao}</dd></div><div><dt className="font-semibold">Maior dificuldade</dt><dd className="whitespace-pre-wrap break-words">{i.dificuldade}</dd></div>
            <div><dt className="font-semibold">Disponibilidade</dt><dd>{i.disponibilidade ? "Tem disponibilidade para testar e enviar sugestões" : "Quer entender as condições primeiro"}</dd></div>
          </dl>
        </article>
      ))}</div>}
      <div className="flex items-center gap-4"><button disabled={pagina <= 1 || carregando} onClick={() => mudarPagina(pagina - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Anterior</button><span>Página {pagina} de {Math.max(1, Math.ceil(total / 50))}</span><button disabled={pagina * 50 >= total || carregando} onClick={() => mudarPagina(pagina + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Próxima</button></div>
    </div>
  );
}

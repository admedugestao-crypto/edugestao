"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Circle, MonitorSmartphone, RefreshCw, Users } from "lucide-react";

type Sessao = {
  id: string; rota: string; dispositivo: string; ultimaAtividade: string;
  usuario: { id: string; nome: string; email: string; perfil: string; foto: string | null };
};
type Empresa = { id: string; nome: string; slug: string; ativo: boolean; sessoesAtivas: Sessao[] };

const ROTAS: Array<[string, string]> = [
  ["/dashboard/agenda", "Agenda"], ["/dashboard/alunos", "Alunos"],
  ["/dashboard/escolas", "Escolas"], ["/dashboard/disciplinas", "Disciplinas"],
  ["/dashboard/tabelas", "Tabelas"], ["/dashboard/calendario", "Calendário"],
  ["/dashboard/notas", "Notas"], ["/dashboard/conteudos", "Conteúdos"],
  ["/dashboard/biblioteca", "Biblioteca"], ["/dashboard/pagamentos", "Pagamentos"],
  ["/dashboard/notificacoes", "Notificações"], ["/dashboard", "Dashboard"],
  ["/m/agenda", "Agenda (app)"], ["/m/conteudos", "Conteúdos (app)"],
  ["/m/biblioteca", "Biblioteca (app)"], ["/m", "Início (app)"],
];

function opcaoAtual(rota: string) {
  return ROTAS.find(([prefixo]) => rota === prefixo || rota.startsWith(`${prefixo}/`))?.[1] ?? "Outra tela";
}

function tempoAtividade(data: string) {
  const segundos = Math.max(0, Math.floor((Date.now() - new Date(data).getTime()) / 1000));
  return segundos < 60 ? "agora" : `há ${Math.floor(segundos / 60)} min`;
}

export default function UsuariosConectadosPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/plataforma/presencas", { cache: "no-store" });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Sua sessão da Plataforma expirou. Entre novamente.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao carregar usuários conectados.");
      setEmpresas(data.empresas);
      setAtualizadoEm(new Date(data.atualizadoEm));
      setErro("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar usuários conectados.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const inicial = window.setTimeout(() => void carregar(), 0);
    const intervalo = window.setInterval(carregar, 30_000);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(intervalo);
    };
  }, [carregar]);

  const totalSessoes = useMemo(() => empresas.reduce((n, e) => n + e.sessoesAtivas.length, 0), [empresas]);
  const totalUsuarios = useMemo(
    () => new Set(empresas.flatMap((e) => e.sessoesAtivas.map((s) => s.usuario.id))).size,
    [empresas]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários conectados</h1>
          <p className="mt-1 text-sm text-slate-500">Atividade registrada nos últimos 2 minutos.</p>
        </div>
        <button onClick={() => void carregar()} disabled={carregando}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={16} className={carregando ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Resumo icon={Building2} titulo="Empresas" valor={empresas.length} />
        <Resumo icon={Users} titulo="Usuários online" valor={totalUsuarios} destaque />
        <Resumo icon={MonitorSmartphone} titulo="Sessões ativas" valor={totalSessoes} />
      </div>

      {erro && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
      {carregando && empresas.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {empresas.map((empresa) => (
            <section key={empresa.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Building2 size={17} className="text-slate-500" />
                  <h2 className="font-semibold text-slate-800">{empresa.nome}</h2>
                  {!empresa.ativo && <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Inativa</span>}
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {empresa.sessoesAtivas.length} {empresa.sessoesAtivas.length === 1 ? "sessão" : "sessões"}
                </span>
              </header>
              {empresa.sessoesAtivas.length === 0 ? (
                <p className="px-5 py-5 text-sm text-slate-400">Nenhum usuário conectado.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {empresa.sessoesAtivas.map((sessao) => (
                    <div key={`${sessao.usuario.id}-${sessao.id}`} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(220px,1fr)_180px_160px_90px] md:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                          {sessao.usuario.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{sessao.usuario.nome}</p>
                          <p className="truncate text-xs text-slate-500">{sessao.usuario.email} · {sessao.usuario.perfil}</p>
                        </div>
                      </div>
                      <div><p className="text-xs text-slate-400">Opção atual</p><p className="text-sm font-medium text-indigo-700">{opcaoAtual(sessao.rota)}</p></div>
                      <div><p className="text-xs text-slate-400">Dispositivo</p><p className="text-sm text-slate-700">{sessao.dispositivo}</p></div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <Circle size={8} className="fill-emerald-500 text-emerald-500" /> {tempoAtividade(sessao.ultimaAtividade)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      {atualizadoEm && <p className="text-right text-xs text-slate-400">Atualizado às {atualizadoEm.toLocaleTimeString("pt-BR")}</p>}
    </div>
  );
}

function Resumo({ icon: Icon, titulo, valor, destaque = false }: {
  icon: typeof Users; titulo: string; valor: number; destaque?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${destaque ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}><Icon size={20} /></div>
      <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{titulo}</p><p className="text-2xl font-bold text-slate-800">{valor}</p></div>
    </div>
  );
}

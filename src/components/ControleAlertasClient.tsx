"use client";

import { useState } from "react";
import { AlertTriangle, BellRing, BookOpen, CalendarClock, CircleDollarSign, ClipboardCheck, Mail, MessageCircle, PauseCircle, PlayCircle } from "lucide-react";

type Configuracao = {
  whatsappPausado: boolean;
  emailPausado: boolean;
  alertasProvaPausados: boolean;
  alertasAulaPausados: boolean;
  alertasConteudoPausados: boolean;
  alertasCobrancaPausados: boolean;
};

type Campo = keyof Configuracao;
type Cartao = { id: Campo; titulo: string; descricao: string; icone: typeof BellRing };

const tiposDeAlerta: Cartao[] = [
  { id: "alertasProvaPausados", titulo: "Provas", descricao: "Lembretes de provas por WhatsApp e e-mail aos professores.", icone: ClipboardCheck },
  { id: "alertasAulaPausados", titulo: "Aulas", descricao: "Lembretes de aulas por WhatsApp ou e-mail aos responsáveis.", icone: CalendarClock },
  { id: "alertasConteudoPausados", titulo: "Conteúdo ministrado", descricao: "E-mail ao responsável quando um conteúdo for registrado.", icone: BookOpen },
  { id: "alertasCobrancaPausados", titulo: "Cobranças", descricao: "E-mails de lembrete, atraso e recibo de pagamentos.", icone: CircleDollarSign },
];

const canais: Cartao[] = [
  { id: "whatsappPausado", titulo: "WhatsApp", descricao: "Pausa todos os alertas que seriam enviados por WhatsApp.", icone: MessageCircle },
  { id: "emailPausado", titulo: "E-mail", descricao: "Pausa todos os alertas que seriam enviados por e-mail.", icone: Mail },
];

export default function ControleAlertasClient(inicial: Configuracao) {
  const [configuracao, setConfiguracao] = useState(inicial);
  const [salvando, setSalvando] = useState<Campo | null>(null);
  const [erro, setErro] = useState("");

  async function alternar(campo: Campo) {
    const proximaConfiguracao = { ...configuracao, [campo]: !configuracao[campo] };
    setSalvando(campo);
    setErro("");
    try {
      const resposta = await fetch("/api/notificacoes/controle-alertas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proximaConfiguracao),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível atualizar os alertas.");
      setConfiguracao(dados);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível atualizar os alertas.");
    } finally {
      setSalvando(null);
    }
  }

  function renderizarCartoes(lista: Cartao[]) {
    return lista.map(({ id, titulo, descricao, icone: Icone }) => {
      const pausado = configuracao[id];
      return (
        <article key={id} className={`rounded-2xl border p-5 ${pausado ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="flex items-start justify-between gap-3">
            <span className={`rounded-xl p-2 ${pausado ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}><Icone size={21} /></span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${pausado ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
              {pausado ? <PauseCircle size={14} /> : <PlayCircle size={14} />}{pausado ? "Pausado" : "Ativo"}
            </span>
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">{titulo}</h3>
          <p className="mt-1 min-h-12 text-sm leading-5 text-slate-600">{descricao}</p>
          <button
            type="button"
            onClick={() => alternar(id)}
            disabled={salvando !== null}
            className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${pausado ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-red-300 bg-white text-red-700 hover:bg-red-50"}`}
          >
            {salvando === id ? "Salvando..." : pausado ? `Reativar ${titulo}` : `Pausar ${titulo}`}
          </button>
        </article>
      );
    });
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 shrink-0 text-indigo-600" size={22} />
          <div>
            <h2 className="font-semibold text-slate-900">Controle de alertas externos</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Escolha quais alertas ficam ativos. Uma cobrança pode ficar pausada sem interromper os lembretes de provas.</p>
          </div>
        </div>
      </div>

      {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Alertas por assunto</h3>
        <div className="grid gap-4 sm:grid-cols-2">{renderizarCartoes(tiposDeAlerta)}</div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Pausa geral por canal</h3>
        <p className="mb-3 text-sm text-slate-500">Use somente quando quiser interromper temporariamente todos os envios de um canal.</p>
        <div className="grid gap-4 sm:grid-cols-2">{renderizarCartoes(canais)}</div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
        <p>Um alerta só é enviado quando o seu assunto e o canal correspondente estiverem ativos. Este controle não interrompe recuperação de senha nem avisos técnicos internos da Plataforma.</p>
      </div>
    </section>
  );
}

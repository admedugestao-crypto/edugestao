"use client";

import { useState } from "react";
import { AlertTriangle, BellRing, Mail, MessageCircle, PauseCircle, PlayCircle } from "lucide-react";

type Canal = "whatsapp" | "email";

export default function ControleAlertasClient({
  whatsappPausado: inicialWhatsapp,
  emailPausado: inicialEmail,
}: {
  whatsappPausado: boolean;
  emailPausado: boolean;
}) {
  const [whatsappPausado, setWhatsappPausado] = useState(inicialWhatsapp);
  const [emailPausado, setEmailPausado] = useState(inicialEmail);
  const [salvando, setSalvando] = useState<Canal | null>(null);
  const [erro, setErro] = useState("");

  async function alternar(canal: Canal) {
    const proximoWhatsapp = canal === "whatsapp" ? !whatsappPausado : whatsappPausado;
    const proximoEmail = canal === "email" ? !emailPausado : emailPausado;
    setSalvando(canal);
    setErro("");
    try {
      const resposta = await fetch("/api/notificacoes/controle-alertas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPausado: proximoWhatsapp, emailPausado: proximoEmail }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível atualizar os alertas.");
      setWhatsappPausado(dados.whatsappPausado);
      setEmailPausado(dados.emailPausado);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível atualizar os alertas.");
    } finally {
      setSalvando(null);
    }
  }

  const canais: Array<{
    id: Canal;
    titulo: string;
    descricao: string;
    pausado: boolean;
    icone: typeof MessageCircle;
  }> = [
    {
      id: "whatsapp",
      titulo: "WhatsApp",
      descricao: "Lembretes de provas e aulas enviados a professores e responsáveis.",
      pausado: whatsappPausado,
      icone: MessageCircle,
    },
    {
      id: "email",
      titulo: "E-mail",
      descricao: "Lembretes, conteúdos ministrados e mensagens financeiras aos responsáveis e professores.",
      pausado: emailPausado,
      icone: Mail,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 shrink-0 text-indigo-600" size={22} />
          <div>
            <h2 className="font-semibold text-slate-900">Controle de alertas externos</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Pause ou reative cada canal de envio desta empresa. A alteração é aplicada imediatamente aos disparos automáticos e manuais.</p>
          </div>
        </div>
      </div>

      {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {canais.map(({ id, titulo, descricao, pausado, icone: Icone }) => (
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
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
        <p>Este controle não interrompe recursos de segurança, como recuperação de senha, nem avisos técnicos internos da Plataforma.</p>
      </div>
    </section>
  );
}

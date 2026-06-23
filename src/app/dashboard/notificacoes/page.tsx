import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bell } from "lucide-react";
import NotificacoesUnificadas from "@/components/NotificacoesUnificadas";
import { emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const session = await auth();
  const perfil = (session?.user as any)?.perfil as string;
  if (perfil !== "SUPERADMIN") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
        Acesso restrito a administradores.
      </div>
    );
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em7dias = new Date(hoje);
  em7dias.setDate(em7dias.getDate() + 7);
  em7dias.setHours(23, 59, 59, 999);

  // ── Dados WhatsApp ──────────────────────────────────────────────────────────
  const avaliacoes = await prisma.avaliacao.findMany({
    where: { data: { gte: hoje, lte: em7dias } },
    include: {
      unidade: { include: { escola: true } },
      materia: true,
      notificacoes: true,
    },
    orderBy: { data: "asc" },
  });

  const historicoWhatsapp = await prisma.notificacaoProva.findMany({
    where: { whatsapp: { not: null } },
    include: {
      professora: { include: { usuario: { select: { nome: true } } } },
      avaliacao: {
        include: { unidade: { include: { escola: true } }, materia: true },
      },
    },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });

  // ── Dados E-mail ────────────────────────────────────────────────────────────
  const historicoEmail = await prisma.notificacaoProva.findMany({
    where: { email: { not: null } },
    include: {
      professora: { include: { usuario: { select: { nome: true, email: true } } } },
      avaliacao: {
        include: { unidade: { include: { escola: true } }, materia: true },
      },
    },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });

  // ── Dados Notificações de Aula ──────────────────────────────────────────────
  const historicoAulas = await prisma.notificacaoAula.findMany({
    include: {
      agendaAula: {
        include: {
          aluno: { select: { nome: true, responsavel: true } },
          professora: { include: { usuario: { select: { nome: true } } } },
          materia: { select: { nome: true } },
        },
      },
    },
    orderBy: { criadoEm: "desc" },
    take: 50,
  });

  const fonnteConfigurada    = !!process.env.FONNTE_TOKEN;
  const zapiConfigurada      = !!(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN);
  const evolutionConfigurada = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE);
  const provedor: "fonnte" | "zapi" | "evolution" | null = fonnteConfigurada ? "fonnte" : zapiConfigurada ? "zapi" : evolutionConfigurada ? "evolution" : null;

  function serAvaliacao(a: (typeof avaliacoes)[0]) {
    return {
      ...a,
      data: a.data.toISOString(),
      criadoEm: a.criadoEm.toISOString(),
      unidade: {
        ...a.unidade,
        criadoEm: a.unidade.criadoEm.toISOString(),
        escola: { ...a.unidade.escola, criadoEm: a.unidade.escola.criadoEm.toISOString() },
      },
    };
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Bell size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Notificações</h1>
      </div>

      <NotificacoesUnificadas
        // WhatsApp
        avaliacoes={avaliacoes.map(serAvaliacao) as any}
        historicoWhatsapp={historicoWhatsapp.map((n) => ({
          id: n.id,
          whatsapp: n.whatsapp!,
          diasAntes: n.diasAntes,
          enviada: n.enviada,
          emailEnviado: n.emailEnviado,
          email: n.email ?? null,
          criadoEm: n.criadoEm.toISOString(),
          professora: { usuario: { nome: n.professora.usuario.nome } },
          avaliacao: {
            nome: n.avaliacao.nome,
            data: n.avaliacao.data.toISOString(),
            materia: n.avaliacao.materia ? { nome: n.avaliacao.materia.nome } : null,
            unidade: { nome: n.avaliacao.unidade.nome, escola: { nome: n.avaliacao.unidade.escola.nome } },
          },
        }))}
        whatsappConfigurado={fonnteConfigurada || zapiConfigurada || evolutionConfigurada}
        provedor={provedor}
        // E-mail
        historicoEmail={historicoEmail.map((n) => ({
          id: n.id,
          diasAntes: n.diasAntes,
          emailEnviado: n.emailEnviado,
          email: n.email!,
          enviada: n.enviada,
          whatsapp: n.whatsapp ?? null,
          criadoEm: n.criadoEm.toISOString(),
          professor: n.professora.usuario.nome,
          avaliacao: {
            nome: n.avaliacao.nome,
            serie: n.avaliacao.serie,
            data: n.avaliacao.data.toISOString(),
            materia: n.avaliacao.materia?.nome ?? null,
            escola: n.avaliacao.unidade.escola.nome,
            unidade: n.avaliacao.unidade.nome,
          },
        }))}
        emailAtivo={emailConfigurado()}
        historicoAulas={historicoAulas.map((n) => ({
          id: n.id,
          enviada: n.enviada,
          whatsapp: n.whatsapp ?? "",
          criadoEm: n.criadoEm.toISOString(),
          agendaAula: {
            data: n.agendaAula.data.toISOString(),
            horaInicio: n.agendaAula.horaInicio,
            horaFim: n.agendaAula.horaFim,
            aluno: n.agendaAula.aluno,
            professora: { usuario: { nome: n.agendaAula.professora.usuario.nome } },
            materia: n.agendaAula.materia,
          },
        }))}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { Bell } from "lucide-react";
import NotificacoesUnificadas from "@/components/NotificacoesUnificadas";
import { emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  if (!scope.isAdmin) {
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

  const [avaliacoes, historicoWhatsapp, historicoEmail, aulasProximas, historicoAulas, empresa] =
    await Promise.all([
      // ── Dados WhatsApp ────────────────────────────────────────────────────
      prisma.avaliacao.findMany({
        where: { empresaId: scope.empresaId, data: { gte: hoje, lte: em7dias } },
        include: {
          unidade: { include: { escola: true } },
          materia: true,
          notificacoes: true,
        },
        orderBy: { data: "asc" },
      }),
      prisma.notificacaoProva.findMany({
        where: { empresaId: scope.empresaId },
        include: {
          professora: { include: { usuario: { select: { nome: true } } } },
          avaliacao: {
            include: { unidade: { include: { escola: true } }, materia: true },
          },
        },
        orderBy: { criadoEm: "desc" },
        take: 50,
      }),
      // ── Dados E-mail ──────────────────────────────────────────────────────
      prisma.notificacaoProva.findMany({
        where: { empresaId: scope.empresaId, email: { not: null } },
        include: {
          professora: { include: { usuario: { select: { nome: true, email: true } } } },
          avaliacao: {
            include: { unidade: { include: { escola: true } }, materia: true },
          },
        },
        orderBy: { criadoEm: "desc" },
        take: 100,
      }),
      // ── Aulas nos próximos 7 dias com responsável cadastrado (telefone e/ou e-mail) ──
      prisma.agendaAula.findMany({
        where: {
          empresaId: scope.empresaId,
          data: { gte: hoje, lte: em7dias },
          status: "AGENDADA",
          aluno: { OR: [{ telefoneResponsavel: { not: null } }, { emailResponsavel: { not: null } }] },
        },
        include: {
          aluno: { select: { nome: true, responsavel: true, telefoneResponsavel: true, emailResponsavel: true } },
          professora: { include: { usuario: { select: { nome: true } } } },
          materia: { select: { nome: true } },
          notificacao: true,
        },
        orderBy: { data: "asc" },
      }),
      // ── Dados Notificações de Aula ──────────────────────────────────────────
      prisma.notificacaoAula.findMany({
        where: { empresaId: scope.empresaId },
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
      }),
      // ── Configuração da empresa (pausa de envio WhatsApp/E-mail + credenciais) ──
      prisma.empresa.findUniqueOrThrow({
        where: { id: scope.empresaId },
        select: {
          whatsappPausado: true, emailPausado: true,
          fonnteToken: true, evolutionApiUrl: true, evolutionApiKey: true, evolutionApiInstance: true,
          emailHost: true, emailPort: true, emailUser: true, emailPass: true, emailFrom: true,
        },
      }),
    ]);

  // Cada empresa usa sua própria conta nos provedores homologados — sem
  // fallback pra variável de ambiente global (ver "Fase 3" no histórico).
  const fonnteConfigurada    = !!empresa.fonnteToken;
  const evolutionConfigurada = !!(empresa.evolutionApiUrl && empresa.evolutionApiKey && empresa.evolutionApiInstance);
  const provedor: "fonnte" | "evolution" | null = fonnteConfigurada ? "fonnte" : evolutionConfigurada ? "evolution" : null;
  const emailAtivo = emailConfigurado(empresa);

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
      notificacoes: a.notificacoes.map((n) => ({ ...n, criadoEm: n.criadoEm.toISOString() })),
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
          whatsapp: n.whatsapp ?? "",
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
        whatsappConfigurado={fonnteConfigurada || evolutionConfigurada}
        provedor={provedor}
        whatsappPausado={empresa.whatsappPausado}
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
        emailAtivo={emailAtivo}
        emailPausado={empresa.emailPausado}
        aulasProximas={aulasProximas.map((a) => ({
          id: a.id,
          data: a.data.toISOString(),
          horaInicio: a.horaInicio,
          horaFim: a.horaFim,
          notificacaoEnviada: a.notificacao?.enviada ?? false,
          notificacaoCriadoEm: a.notificacao?.criadoEm.toISOString() ?? null,
          aluno: a.aluno,
          professora: { usuario: { nome: a.professora.usuario.nome } },
          materia: a.materia,
        }))}
        historicoAulas={historicoAulas.map((n) => ({
          id: n.id,
          agendaAulaId: n.agendaAulaId,
          enviada: n.enviada,
          whatsapp: n.whatsapp ?? "",
          emailEnviado: n.emailEnviado,
          email: n.email ?? null,
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

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Mail } from "lucide-react";
import HistoricoEmailsClient from "@/components/HistoricoEmailsClient";
import { emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function NotificacoesEmailPage() {
  const session = await auth();
  const perfil = (session?.user as any)?.perfil as string;
  if (perfil !== "SUPERADMIN") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
        Acesso restrito a administradores.
      </div>
    );
  }

  // Histórico completo de e-mails (enviados e com falha)
  const historico = await prisma.notificacaoProva.findMany({
    where: { email: { not: null } },
    include: {
      professora: { include: { usuario: { select: { nome: true, email: true } } } },
      avaliacao: {
        include: {
          unidade: { include: { escola: true } },
          materia: true,
        },
      },
    },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });

  const emailAtivo = emailConfigurado();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Mail size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Histórico de E-mails — Provas</h1>
      </div>

      <HistoricoEmailsClient
        emailAtivo={emailAtivo}
        historico={historico.map((n) => ({
          id: n.id,
          diasAntes: n.diasAntes,
          emailEnviado: n.emailEnviado,
          email: n.email!,
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
      />
    </div>
  );
}

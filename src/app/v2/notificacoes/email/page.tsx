import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import Link from "next/link";
import styles from "../../notificacoes.module.css";
import HistoricoEmailsClient from "@/components/HistoricoEmailsClient";
import { emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function NotificacoesEmailPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  if (!scope.isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
        Acesso restrito a administradores.
      </div>
    );
  }

  // Histórico completo de e-mails (enviados e com falha)
  const [historico, empresa] = await Promise.all([
    prisma.notificacaoProva.findMany({
      where: { empresaId: scope.empresaId, email: { not: null } },
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
    }),
    prisma.empresa.findUniqueOrThrow({
      where: { id: scope.empresaId },
      select: { emailHost: true, emailPort: true, emailUser: true, emailPass: true, emailFrom: true },
    }),
  ]);

  const emailAtivo = emailConfigurado(empresa);

  return (
    <div className={styles.page}>
      <header className={styles.header}><div><h1>Histórico de e-mails</h1><p>Consulte os envios de avaliações e encontre registros com falha.</p></div>
        <Link href="/v2/notificacoes">Voltar às notificações</Link>
      </header>

      <HistoricoEmailsClient
        variant="v2"
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { getSessionScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import ControleAlertasClient from "@/components/ControleAlertasClient";
import styles from "../../notificacoes.module.css";

export const dynamic = "force-dynamic";

export default async function ControleAlertasPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  if (!scope.isAdmin) {
    return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Acesso restrito a administradores.</div>;
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: scope.empresaId },
    select: {
      whatsappPausado: true,
      emailPausado: true,
      alertasProvaPausados: true,
      alertasAulaPausados: true,
      alertasConteudoPausados: true,
      alertasCobrancaPausados: true,
    },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className="flex items-center gap-2"><Settings2 size={22} className="text-indigo-600" /><h1>Controle de alertas</h1></div>
          <p>Gerencie cada tipo de alerta e os canais de envio externos da sua empresa.</p>
        </div>
        <Link href="/v2/notificacoes">Voltar às notificações</Link>
      </header>
      <div className="min-h-0 overflow-auto px-1 pb-5">
        <ControleAlertasClient {...empresa} />
      </div>
    </div>
  );
}

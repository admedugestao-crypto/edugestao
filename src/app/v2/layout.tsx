import { auth } from "@/lib/auth";
import { ambienteAtual } from "@/lib/ambiente";
import { prisma } from "@/lib/prisma";
import PresenceTracker from "@/components/PresenceTracker";
import { redirect } from "next/navigation";
import { V2Navigation } from "./_components/V2Navigation";
import styles from "./v2.module.css";

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as typeof session.user & {
    id?: string;
    empresaId?: string;
    perfil?: string;
  };

  const [usuario, empresa] = await Promise.all([
    user.id
      ? prisma.usuario.findUnique({ where: { id: user.id }, select: { foto: true } })
      : null,
    user.empresaId
      ? prisma.empresa.findUnique({
          where: { id: user.empresaId },
          select: { nome: true, logoUrl: true },
        })
      : null,
  ]);

  return (
    <div className={styles.appShell}>
      <PresenceTracker />
      <V2Navigation
        ambiente={ambienteAtual()}
        empresaNome={empresa?.nome ?? "EduGestão"}
        empresaLogoUrl={empresa?.logoUrl ?? null}
        usuario={{
          nome: user.name ?? "Usuário",
          email: user.email ?? "",
          foto: usuario?.foto ?? null,
          perfil: user.perfil ?? "PROFESSORA",
        }}
      />
      <main className={styles.main}>{children}</main>
    </div>
  );
}

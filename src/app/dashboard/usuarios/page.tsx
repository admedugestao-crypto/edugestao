import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { UserCog } from "lucide-react";
import UsuariosClient from "@/components/UsuariosClient";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const session = await auth();
  const sessionUserId = (session?.user as any)?.id as string;

  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: scope.empresaId },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      ativo: true,
      foto: true,
      whatsapp: true,
      criadoEm: true,
      professora: { select: { disponibilidade: true } },
    },
    orderBy: { nome: "asc" },
  });

  const usuariosSerial = usuarios.map((u) => ({
    ...u,
    criadoEm: u.criadoEm.toISOString(),
    disponibilidade: (u.professora?.disponibilidade as any) ?? [],
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <UserCog size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Usuários</h1>
        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
          {usuarios.length}
        </span>
      </div>
      <UsuariosClient
        usuariosIniciais={usuariosSerial as any}
        sessionUserId={sessionUserId}
      />
    </div>
  );
}

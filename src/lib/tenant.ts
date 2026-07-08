import { auth } from "@/lib/auth";

export type SessionScope = {
  userId: string;
  empresaId: string;
  professoraId: string | null;
  perfil: "SUPERADMIN" | "PROFESSORA" | "AUXILIAR" | "PLATAFORMA";
  isAdmin: boolean;
};

// Escopo da sessão atual para uso nas rotas/páginas do dashboard (empresa
// escopada). Retorna null se não autenticado ou se for um usuário PLATAFORMA
// (que não pertence a nenhuma empresa e não deve acessar dados operacionais).
export async function getSessionScope(): Promise<SessionScope | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as any;
  if (!u.empresaId) return null;
  return {
    userId: u.id,
    empresaId: u.empresaId,
    professoraId: u.professoraId ?? null,
    perfil: u.perfil,
    isAdmin: u.perfil === "SUPERADMIN",
  };
}

// Monta o where-clause escopado à empresa e, para não-admins, também à
// professora da sessão. `extra` mescla filtros adicionais do chamador sem
// derrubar o escopo de tenant.
export function scopeWhere(
  scope: SessionScope,
  opts?: { professoraField?: string; extra?: Record<string, any> },
) {
  const where: Record<string, any> = { empresaId: scope.empresaId, ...(opts?.extra ?? {}) };
  if (!scope.isAdmin && scope.professoraId) {
    where[opts?.professoraField ?? "professoraId"] = scope.professoraId;
  }
  return where;
}

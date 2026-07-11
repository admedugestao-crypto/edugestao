import { auth } from "@/lib/auth";

// Confirma que a sessão atual é de um usuário PLATAFORMA (uso interno,
// sem empresaId) — usado para proteger as rotas /api/plataforma/**.
export async function requirePlataforma() {
  const session = await auth();
  if ((session?.user as any)?.perfil !== "PLATAFORMA") return null;
  return session;
}

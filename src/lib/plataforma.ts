import { plataformaAuth } from "@/lib/plataformaSession";

// Confirma que a sessão atual é de um usuário PLATAFORMA (uso interno,
// sem empresaId) — usado para proteger as rotas /api/plataforma/**.
export async function requirePlataforma() {
  return plataformaAuth();
}

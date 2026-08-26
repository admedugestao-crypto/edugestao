import type { SessionScope } from "@/lib/tenant";

type EscopoPermissao = Pick<SessionScope, "isAdmin" | "professoraId">;

export function podeAcessarProfessora(scope: EscopoPermissao, professoraId: string | null): boolean {
  return scope.isAdmin || (!!scope.professoraId && scope.professoraId === professoraId);
}

export function podeGerenciarFinanceiro(scope: Pick<SessionScope, "isAdmin">): boolean {
  return scope.isAdmin;
}

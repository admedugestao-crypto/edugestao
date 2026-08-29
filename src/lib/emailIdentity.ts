export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function deveExigirTrocaSenha(perfil: string): boolean {
  return perfil !== "PLATAFORMA";
}

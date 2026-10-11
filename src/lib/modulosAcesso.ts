export const MODULOS_ACESSO: Record<string, string> = {
  inicio: "Início", agenda: "Agenda", alunos: "Alunos", conteudos: "Conteúdos",
  biblioteca: "Biblioteca", pagamentos: "Pagamentos", notas: "Notas",
  escolas: "Escolas", disciplinas: "Disciplinas", calendario: "Calendário",
  tabelas: "Tabelas", notificacoes: "Notificações", "notificacoes-email": "Notificações por e-mail",
};

export function moduloDaRota(rota: string): string | null {
  if (!/^\/(dashboard|m)(\/|$)/.test(rota)) return null;
  const modulo = rota.split("/")[2] || "inicio";
  return Object.hasOwn(MODULOS_ACESSO, modulo) ? modulo : null;
}

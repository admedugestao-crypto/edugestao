/** Normaliza IDs recebidos do cliente, removendo vazios e duplicados. */
export function normalizarIds(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return [...new Set(
    valor
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

export function todosIdsEncontrados(solicitados: string[], encontrados: string[]): boolean {
  const encontradosSet = new Set(encontrados);
  return solicitados.every((id) => encontradosSet.has(id));
}

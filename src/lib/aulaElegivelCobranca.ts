export function aulaElegivelParaCobrancaAutomatica(status: string, reposicao: boolean): boolean {
  return !reposicao && (status === "REALIZADA" || status === "FALTA_ALUNO");
}

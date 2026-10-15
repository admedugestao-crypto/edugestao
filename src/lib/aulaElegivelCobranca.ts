export function aulaElegivelParaCobrancaAutomatica(status: string, reposicao: boolean, geraFatura = true): boolean {
  return geraFatura && !reposicao && (status === "REALIZADA" || status === "FALTA_ALUNO");
}

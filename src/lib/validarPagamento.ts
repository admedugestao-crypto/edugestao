export function dataFinanceiraValida(valor: unknown): boolean {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(valor)) return false;
  const data = new Date(valor);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0,10) === valor.slice(0,10);
}
export function erroPagamento(body: Record<string, unknown>, criacao = false): string | null {
  if ((criacao || body.valorCobrado !== undefined) && (typeof body.valorCobrado !== "number" || !Number.isFinite(body.valorCobrado) || body.valorCobrado < 0)) return "Valor da cobrança inválido.";
  if ((criacao || body.dataVencimento !== undefined) && !dataFinanceiraValida(body.dataVencimento)) return "Vencimento inválido.";
  if (body.dataPagamento != null && !dataFinanceiraValida(body.dataPagamento)) return "Data do pagamento inválida.";
  if (body.pago !== undefined && typeof body.pago !== "boolean") return "Situação do pagamento inválida.";
  if (body.quantidadeAulas != null && (typeof body.quantidadeAulas !== "number" || !Number.isInteger(body.quantidadeAulas) || body.quantidadeAulas < 0)) return "Quantidade de aulas inválida.";
  if (criacao && (!Number.isInteger(body.mes) || Number(body.mes) < 1 || Number(body.mes) > 12 || !Number.isInteger(body.ano) || Number(body.ano) < 2000 || Number(body.ano) > 2100 || (body.parcela !== undefined && (!Number.isInteger(body.parcela) || Number(body.parcela) < 1)))) return "Período ou parcela inválidos.";
  return null;
}

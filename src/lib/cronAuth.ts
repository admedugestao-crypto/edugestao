import { timingSafeEqual } from "node:crypto";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; erro: string };

function segredoIgual(recebido: string | null, esperado: string): boolean {
  if (!recebido) return false;
  const recebidoBuffer = Buffer.from(recebido);
  const esperadoBuffer = Buffer.from(esperado);
  return recebidoBuffer.length === esperadoBuffer.length
    && timingSafeEqual(recebidoBuffer, esperadoBuffer);
}

/**
 * Autoriza uma execução de cron. A configuração é fail-closed: uma instalação
 * sem CRON_SECRET nunca pode transformar a rota de disparos em endpoint público.
 */
export function autorizarCron(headers: Headers, secret = process.env.CRON_SECRET): CronAuthResult {
  const segredo = secret?.trim();
  if (!segredo) {
    return {
      ok: false,
      status: 503,
      erro: "Serviço de notificações não configurado.",
    };
  }

  const authorization = headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const cronKey = headers.get("x-cron-key");

  if (!segredoIgual(bearer, segredo) && !segredoIgual(cronKey, segredo)) {
    return { ok: false, status: 401, erro: "Não autorizado" };
  }

  return { ok: true };
}

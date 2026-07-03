// Detecta dispositivos móveis pelo User-Agent — usado para direcionar o
// primeiro acesso (raiz/login/dashboard) para a versão mobile (/m) em vez
// da versão desktop.
const MOBILE_UA_REGEX = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;

export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return MOBILE_UA_REGEX.test(userAgent);
}

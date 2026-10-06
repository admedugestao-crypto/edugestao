/** Aceita somente destinos internos da V2, sem redirecionamento externo. */
export function destinoV2AposLogin(valor: string | null): string | null {
  if (!valor || /[\\\u0000-\u0020]/.test(valor)) return null;
  try {
    const url = new URL(valor, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || !valor.startsWith('/')) return null;
    if (url.pathname !== '/v2' && !url.pathname.startsWith('/v2/')) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}

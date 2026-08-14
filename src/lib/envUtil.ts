// Remove BOM (U+FEFF) e espaços que às vezes vêm junto ao colar a variável de
// ambiente no painel da Vercel (ou o valor no banco) — sem isso, fetch()/
// nodemailer lança erro ao usar o valor como header/credencial.
const BOM = String.fromCharCode(65279);
export function limparEnv(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const limpo = (v.startsWith(BOM) ? v.slice(BOM.length) : v).trim();
  return limpo || undefined;
}

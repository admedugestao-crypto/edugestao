// process.env.VERCEL_ENV só existe em deploys na Vercel ("production" ou
// "preview"); localmente (next dev) fica undefined. Qualquer coisa que não
// seja produção é tratada como Desenvolvimento.
export function ambienteAtual(): "Produção" | "Desenvolvimento" {
  return process.env.VERCEL_ENV === "production" ? "Produção" : "Desenvolvimento";
}

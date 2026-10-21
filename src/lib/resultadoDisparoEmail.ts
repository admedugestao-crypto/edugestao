type ResultadoEnvios = { enviadas?: number; erros?: string[] };
export function resumirDisparoEmail(data: {
  email?: ResultadoEnvios;
  conteudos?: ResultadoEnvios & { restantes?: number };
  conteudosPausados?: boolean;
}) {
  const erros = [...(data.email?.erros ?? []), ...(data.conteudos?.erros ?? [])];
  const restantes = data.conteudos?.restantes ?? 0;
  const txt = `${data.conteudos?.enviadas ?? 0} e-mail(s) de conteúdos de hoje e ${data.email?.enviadas ?? 0} lembrete(s) de provas enviado(s).`
    + (data.conteudosPausados ? " Os alertas de conteúdo estão pausados." : "")
    + (restantes ? ` Ainda há ${restantes} conteúdo(s) pendente(s). Execute novamente para continuar.` : "")
    + (erros.length ? ` Falhas: ${erros.join("; ")}` : "");
  return { ok: erros.length === 0 && restantes === 0, txt };
}

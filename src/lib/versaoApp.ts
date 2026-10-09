import pacote from "../../package.json";

export type VersaoApp = { numero: string; commit: string | null; url: string | null };

/** Identifica a versão declarada no projeto e o commit usado no deployment. */
export function obterVersaoApp(env: Readonly<Record<string, string | undefined>> = process.env): VersaoApp {
  const referencia = env.VERCEL_GIT_COMMIT_SHA ?? env.GITHUB_SHA;
  const commit = referencia && /^[a-f0-9]{40}$/i.test(referencia) ? referencia.toLowerCase() : null;
  return {
    numero: pacote.version,
    commit,
    url: commit ? `https://github.com/admedugestao-crypto/edugestao/commit/${commit}` : null,
  };
}

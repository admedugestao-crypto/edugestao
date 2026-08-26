import type { NextConfig } from "next";
import path from "path";
import { validateAndNormalizeDatabaseUrl } from "./src/lib/databaseConfig";

// ── Garante DATABASE_URL antes de qualquer módulo ser avaliado ────────────────
// O Prisma 7.x lê process.env.DATABASE_URL no momento em que
// @prisma/client/runtime/client é avaliado — que é um pacote externo
// (serverExternalPackages) e portanto lê o process.env real do Node.js,
// não as substituições em tempo de compilação do bundler.
//
// next.config.ts roda no mesmo processo Node.js que o "next build", então
// qualquer process.env definido aqui é herdado pelos workers filhos que
// avaliam os módulos durante "Collecting page data".
//
// Em produção (Vercel runtime), DATABASE_URL já está definida pela
// variável de ambiente do projeto e esta linha não é executada.
if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    throw new Error("Deploy bloqueado: DATABASE_URL não configurada em produção.");
  }
  validateAndNormalizeDatabaseUrl(process.env.DATABASE_URL, process.env);
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://build_placeholder:build_placeholder@localhost:5432/build_placeholder";
}

const nextConfig: NextConfig = {
  devIndicators: false,
  // Importa só os ícones usados de lucide-react em vez do barrel inteiro,
  // reduzindo o first-load JS de praticamente toda rota.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Garante que o Prisma client (e dependências Node.js nativas) nunca seja
  // empacotado para o Edge Runtime nem para o bundler do lado do servidor.
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Permite acessar o servidor de dev pelo IP da rede local (ex: celular no
  // mesmo Wi-Fi) — sem isso o Next 16 bloqueia HMR/fontes/recursos de dev
  // vindos de uma origem diferente de "localhost", quebrando a página.
  allowedDevOrigins: ["192.168.18.10"],
  // Fixa a raiz do Turbopack neste diretório — sem isso, quando rodando num
  // git worktree (que tem seu próprio package-lock.json além do da raiz do
  // repo principal), o Turbopack infere a raiz errada e quebra o roteamento
  // de rotas dinâmicas como /api/auth/[...nextauth] (tudo 404).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

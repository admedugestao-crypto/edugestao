import type { NextConfig } from "next";

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
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://build_placeholder:build_placeholder@localhost:5432/build_placeholder";
}

const nextConfig: NextConfig = {
  devIndicators: false,
  // Garante que o Prisma client (e dependências Node.js nativas) nunca seja
  // empacotado para o Edge Runtime nem para o bundler do lado do servidor.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;

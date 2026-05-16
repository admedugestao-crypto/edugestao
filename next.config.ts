import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Garante que o Prisma client (e dependências Node.js nativas) nunca seja
  // empacotado para o Edge Runtime nem para o bundler do lado do servidor.
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Durante o build na Vercel, DATABASE_URL não está disponível como variável
  // de ambiente, então new PrismaClient() lança PrismaClientInitializationError
  // ao carregar qualquer módulo que importe prisma.ts.
  // Fornecemos um URL sintático válido como fallback — o Prisma armazena a
  // configuração mas NÃO conecta ao banco no construtor, então o build passa
  // normalmente. Em runtime, a variável real da Vercel sobrescreve este valor.
  env: {
    DATABASE_URL:
      process.env.DATABASE_URL ??
      "postgresql://build_placeholder:build_placeholder@localhost:5432/build_placeholder",
  },
};

export default nextConfig;

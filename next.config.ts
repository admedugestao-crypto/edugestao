import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Garante que o Prisma client (e dependências Node.js nativas) nunca seja
  // empacotado para o Edge Runtime nem para o bundler do lado do servidor.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;

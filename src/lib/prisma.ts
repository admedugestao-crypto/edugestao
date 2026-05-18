import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const url =
    process.env.DATABASE_URL ??
    "postgresql://build_placeholder:build_placeholder@localhost:5432/build_placeholder";
  // @ts-ignore — Prisma 7 "prisma-client" provider aceita datasourceUrl
  return new PrismaClient({ datasourceUrl: url });
}

// Proxy lazy — new PrismaClient() só é chamado no primeiro acesso real
// (durante uma requisição), NUNCA durante a avaliação do módulo (build time).
// Isso evita o PrismaClientInitializationError na fase "Collecting page data".
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    const client = globalForPrisma.prisma!;
    const value = (client as any)[prop];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});

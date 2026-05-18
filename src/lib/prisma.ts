import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  // @ts-ignore — Prisma 7 "prisma-client" provider lê DATABASE_URL do ambiente
  return new PrismaClient();
}

// Proxy lazy — new PrismaClient() é chamado APENAS no primeiro acesso real
// (durante uma requisição HTTP), NUNCA durante a avaliação do módulo no build.
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

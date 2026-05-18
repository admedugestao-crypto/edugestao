import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

// Proxy lazy — new PrismaClient() só é chamado no primeiro acesso real
// (durante requisição HTTP), NUNCA durante a avaliação do módulo no build.
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

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const rawUrl =
    process.env.DATABASE_URL ??
    process.env.DIRECT_URL ??
    "postgresql://build_placeholder:build_placeholder@localhost:5432/build_placeholder";
  const connectionString = rawUrl.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "");
  const adapter = new PrismaPg({ connectionString });
  // @ts-ignore — PrismaClient aceita adapter no Prisma 7
  return new PrismaClient({ adapter });
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

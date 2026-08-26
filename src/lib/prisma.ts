import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dns from "dns";
import { getDatabaseRuntimeConfig } from "@/lib/databaseConfig";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const { connectionString, max } = getDatabaseRuntimeConfig();
  // Força resolução IPv4 — alguns ambientes de desenvolvimento não têm
  // saída IPv6, e o pooler do Supabase resolve para IPv6 por padrão.
  const adapter = new PrismaPg({
    connectionString,
    // Uma conexão por instância serverless evita esgotar o pool pequeno do
    // Supabase. DATABASE_POOL_MAX permite ajuste controlado entre 1 e 5.
    max,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    lookup: (hostname: string, options: dns.LookupOneOptions, callback: (...args: any[]) => void) =>
      dns.lookup(hostname, { family: 4 }, callback),
  } as any);
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

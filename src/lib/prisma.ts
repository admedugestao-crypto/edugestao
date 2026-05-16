import { PrismaClient } from "@/generated/prisma/client";

// Durante o build na Vercel, DATABASE_URL não existe no process.env real.
// Prisma 7.x lança PrismaClientInitializationError no CONSTRUTOR se a URL
// estiver ausente — isso impede o carregamento de qualquer módulo que importe
// este arquivo, mesmo com export const dynamic = "force-dynamic".
// Solução: garantir um URL sintaticamente válido antes de instanciar o cliente.
// Em produção a variável real da Vercel já estará definida, então este bloco
// não é executado e o comportamento não muda.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://build_placeholder:build_placeholder@localhost:5432/build_placeholder";
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// @ts-ignore
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

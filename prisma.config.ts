import { defineConfig } from "prisma/config";

// Carrega .env localmente (o Prisma CLI avalia este arquivo ANTES de carregar .env)
try { (process as any).loadEnvFile?.(); } catch {}
try { (process as any).loadEnvFile?.(".env.local"); } catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});

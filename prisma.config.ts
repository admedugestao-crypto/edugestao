import { defineConfig } from "prisma/config";

// Carrega .env e .env.local (nessa ordem). `process.loadEnvFile` NÃO
// sobrescreve variáveis já setadas, então usamos dotenv com override:true
// pra .env.local vencer — igual ao Next.js faz entre esses dois arquivos.
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Histórico anterior preservado em prisma/migrations para auditoria.
    // Bancos existentes precisam registrar a baseline após conferir o schema.
    path: "prisma/migrations-v2",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});

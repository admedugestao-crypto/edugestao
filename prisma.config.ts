import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "postgresql://postgres:EduGestao2026@db.kwabqdrmcomnlrjvipiy.supabase.co:5432/postgres",
  },
});
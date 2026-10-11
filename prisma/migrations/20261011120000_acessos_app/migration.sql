CREATE TABLE "acessos_app" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "modulo" TEXT NOT NULL,
  "canal" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "acessos_app_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "acessos_app_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "acessos_app_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "acessos_app_criadoEm_idx" ON "acessos_app"("criadoEm");
CREATE INDEX "acessos_app_empresaId_criadoEm_idx" ON "acessos_app"("empresaId", "criadoEm");
CREATE INDEX "acessos_app_usuarioId_criadoEm_idx" ON "acessos_app"("usuarioId", "criadoEm");

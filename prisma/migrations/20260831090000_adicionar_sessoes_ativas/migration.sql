CREATE TABLE "sessoes_ativas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rota" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaAtividade" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessoes_ativas_pkey" PRIMARY KEY ("id", "usuarioId")
);

CREATE INDEX "sessoes_ativas_empresaId_ultimaAtividade_idx" ON "sessoes_ativas"("empresaId", "ultimaAtividade");
CREATE INDEX "sessoes_ativas_usuarioId_idx" ON "sessoes_ativas"("usuarioId");

ALTER TABLE "sessoes_ativas" ADD CONSTRAINT "sessoes_ativas_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessoes_ativas" ADD CONSTRAINT "sessoes_ativas_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

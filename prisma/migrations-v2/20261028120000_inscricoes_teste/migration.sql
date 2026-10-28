CREATE TABLE "inscricoes_teste" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "materias" TEXT NOT NULL,
    "quantidadeAlunos" INTEGER NOT NULL,
    "organizacao" TEXT NOT NULL,
    "dificuldade" TEXT NOT NULL,
    "disponibilidade" BOOLEAN NOT NULL,
    "consentimentoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versaoConsentimento" TEXT NOT NULL DEFAULT 'teste-eg-v2-2026-10',
    "origemHash" TEXT NOT NULL,
    "contatadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inscricoes_teste_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "inscricoes_teste_whatsapp_key" ON "inscricoes_teste"("whatsapp");
CREATE INDEX "inscricoes_teste_criadoEm_idx" ON "inscricoes_teste"("criadoEm");
CREATE INDEX "inscricoes_teste_origemHash_criadoEm_idx" ON "inscricoes_teste"("origemHash", "criadoEm");
CREATE INDEX "inscricoes_teste_email_idx" ON "inscricoes_teste"("email");

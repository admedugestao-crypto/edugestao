CREATE TABLE "parametrizacao_plataforma" (
    "id" TEXT NOT NULL DEFAULT 'geral',
    "emailHost" TEXT NOT NULL,
    "emailPort" INTEGER NOT NULL DEFAULT 587,
    "emailUser" TEXT NOT NULL,
    "emailSenhaCifrada" TEXT NOT NULL,
    "emailFrom" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parametrizacao_plataforma_pkey" PRIMARY KEY ("id")
);

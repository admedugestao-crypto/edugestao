ALTER TABLE "empresas" ADD COLUMN "prazoAlertaProvaDias" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_prazoAlertaProvaDias_check"
  CHECK ("prazoAlertaProvaDias" BETWEEN 1 AND 365);

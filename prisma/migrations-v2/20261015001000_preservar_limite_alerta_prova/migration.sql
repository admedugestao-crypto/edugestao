-- Restrição do histórico legado não representada pelo schema Prisma.
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_prazoAlertaProvaDias_check"
  CHECK ("prazoAlertaProvaDias" BETWEEN 1 AND 365);

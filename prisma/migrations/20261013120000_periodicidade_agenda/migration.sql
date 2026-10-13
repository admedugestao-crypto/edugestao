CREATE TYPE "PeriodicidadeAgenda" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL');
ALTER TABLE "alunos" ADD COLUMN "periodicidadeAgenda" "PeriodicidadeAgenda" NOT NULL DEFAULT 'SEMANAL';

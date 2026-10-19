ALTER TABLE "empresas"
  ADD COLUMN "alertasProvaPausados" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "alertasAulaPausados" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "alertasConteudoPausados" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "alertasCobrancaPausados" BOOLEAN NOT NULL DEFAULT false;

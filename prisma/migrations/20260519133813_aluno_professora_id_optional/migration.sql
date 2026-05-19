-- DropForeignKey
ALTER TABLE "alunos" DROP CONSTRAINT "alunos_professoraId_fkey";

-- AlterTable
ALTER TABLE "alunos" ALTER COLUMN "professoraId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_professoraId_fkey" FOREIGN KEY ("professoraId") REFERENCES "professoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

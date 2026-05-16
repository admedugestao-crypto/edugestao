import { PrismaClient, Perfil } from "../src/generated/prisma/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const senhaHash = await bcrypt.hash("admin123", 10);

  await prisma.usuario.upsert({
    where: { email: "admin@edugestao.com" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@edugestao.com",
      senhaHash,
      perfil: Perfil.SUPERADMIN,
    },
  });

  const senhaProf = await bcrypt.hash("prof123", 10);
  const prof = await prisma.usuario.upsert({
    where: { email: "ana@edugestao.com" },
    update: {},
    create: {
      nome: "Ana Paula",
      email: "ana@edugestao.com",
      senhaHash: senhaProf,
      perfil: Perfil.PROFESSORA,
      professora: {
        create: { telefone: "(11) 99999-1234" },
      },
    },
    include: { professora: true },
  });

  const matematica = await prisma.materia.upsert({
    where: { nome: "Matemática" },
    update: {},
    create: { nome: "Matemática", cor: "#6366f1" },
  });
  const portugues = await prisma.materia.upsert({
    where: { nome: "Português" },
    update: {},
    create: { nome: "Português", cor: "#ec4899" },
  });
  const fisica = await prisma.materia.upsert({
    where: { nome: "Física" },
    update: {},
    create: { nome: "Física", cor: "#f59e0b" },
  });

  if (prof.professora) {
    const pid = prof.professora.id;
    for (const mid of [matematica.id, portugues.id, fisica.id]) {
      await prisma.professoraMateria.upsert({
        where: { professoraId_materiaId: { professoraId: pid, materiaId: mid } },
        update: {},
        create: { professoraId: pid, materiaId: mid },
      });
    }
  }

  await prisma.escola.upsert({
    where: { id: "escola-demo" },
    update: {},
    create: {
      id: "escola-demo",
      nome: "Colégio Dom Bosco",
      rede: "Particular",
      unidades: {
        create: [
          {
            id: "unidade-centro",
            nome: "Unidade Centro",
            cidade: "São Paulo",
            estado: "SP",
            turno: "Manhã e Tarde",
          },
          {
            id: "unidade-sul",
            nome: "Unidade Sul",
            cidade: "São Paulo",
            estado: "SP",
            turno: "Manhã",
          },
        ],
      },
    },
  });

  console.log("✅ Seed concluído:");
  console.log("   Admin:      admin@edugestao.com / admin123");
  console.log("   Professora: ana@edugestao.com   / prof123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

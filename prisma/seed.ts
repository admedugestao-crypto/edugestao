import { PrismaClient, Perfil } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = (process.env.DATABASE_URL ?? "").replace("?pgbouncer=true", "").replace("&pgbouncer=true", "");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { slug: "demo" },
    update: {},
    create: { nome: "Empresa Demo", slug: "demo" },
  });

  const senhaHash = await bcrypt.hash("admin123", 10);

  await prisma.usuario.upsert({
    where: { empresaId_email: { empresaId: empresa.id, email: "admin@edugestao.com" } },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: "Administrador",
      email: "admin@edugestao.com",
      senhaHash,
      perfil: Perfil.SUPERADMIN,
    },
  });

  const senhaProf = await bcrypt.hash("prof123", 10);
  const prof = await prisma.usuario.upsert({
    where: { empresaId_email: { empresaId: empresa.id, email: "ana@edugestao.com" } },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: "Ana Paula",
      email: "ana@edugestao.com",
      senhaHash: senhaProf,
      perfil: Perfil.PROFESSORA,
      professora: {
        create: { empresaId: empresa.id, telefone: "(11) 99999-1234" },
      },
    },
    include: { professora: true },
  });

  const matematica = await prisma.materia.upsert({
    where: { empresaId_nome: { empresaId: empresa.id, nome: "Matemática" } },
    update: {},
    create: { empresaId: empresa.id, nome: "Matemática", cor: "#6366f1" },
  });
  const portugues = await prisma.materia.upsert({
    where: { empresaId_nome: { empresaId: empresa.id, nome: "Português" } },
    update: {},
    create: { empresaId: empresa.id, nome: "Português", cor: "#ec4899" },
  });
  const fisica = await prisma.materia.upsert({
    where: { empresaId_nome: { empresaId: empresa.id, nome: "Física" } },
    update: {},
    create: { empresaId: empresa.id, nome: "Física", cor: "#f59e0b" },
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
      empresaId: empresa.id,
      nome: "Colégio Dom Bosco",
      rede: "Particular",
      unidades: {
        create: [
          {
            id: "unidade-centro",
            empresaId: empresa.id,
            nome: "Unidade Centro",
            cidade: "São Paulo",
            estado: "SP",
            turno: "Manhã e Tarde",
          },
          {
            id: "unidade-sul",
            empresaId: empresa.id,
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
  console.log("   Empresa:    demo (slug: demo)");
  console.log("   Admin:      admin@edugestao.com / admin123");
  console.log("   Professora: ana@edugestao.com   / prof123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

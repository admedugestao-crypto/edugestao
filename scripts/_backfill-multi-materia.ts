import { prisma } from "@/lib/prisma";

async function main() {
  const conteudos = await prisma.conteudo.findMany({
    where: { materiaId: { not: null } },
    select: { id: true, materiaId: true },
  });
  let cCriados = 0;
  for (const c of conteudos) {
    await prisma.conteudoMateria.upsert({
      where: { conteudoId_materiaId: { conteudoId: c.id, materiaId: c.materiaId! } },
      update: {},
      create: { conteudoId: c.id, materiaId: c.materiaId! },
    });
    cCriados++;
  }

  const materiais = await prisma.materialBiblioteca.findMany({
    where: { materiaId: { not: null } },
    select: { id: true, materiaId: true },
  });
  let mCriados = 0;
  for (const m of materiais) {
    await prisma.materialBibliotecaMateria.upsert({
      where: { materialId_materiaId: { materialId: m.id, materiaId: m.materiaId! } },
      update: {},
      create: { materialId: m.id, materiaId: m.materiaId! },
    });
    mCriados++;
  }

  console.log({ conteudoMateriaCriados: cCriados, materialBibliotecaMateriaCriados: mCriados });
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

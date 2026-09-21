import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
import { prisma } from './src/lib/prisma';

(async () => {
  const materiais = await prisma.materialBiblioteca.findMany({
    where: { metodoTexto: { not: null } },
    select: { id: true, empresaId: true, metodoTexto: true },
  });

  const cache = new Map<string, string>(); // `${empresaId}::${nome}` -> metodoId

  for (const m of materiais) {
    const nome = m.metodoTexto!.trim();
    if (!nome) continue;
    const chave = `${m.empresaId}::${nome}`;
    let metodoId = cache.get(chave);
    if (!metodoId) {
      const metodo = await prisma.metodoEnsino.upsert({
        where: { empresaId_nome: { empresaId: m.empresaId, nome } },
        create: { empresaId: m.empresaId, nome },
        update: {},
      });
      metodoId = metodo.id;
      cache.set(chave, metodoId);
    }
    await prisma.materialBiblioteca.update({ where: { id: m.id }, data: { metodoId } });
    console.log(`OK: material ${m.id} -> metodo "${nome}" (${metodoId})`);
  }

  console.log(`Backfill concluido. ${materiais.length} materiais processados, ${cache.size} metodos criados.`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

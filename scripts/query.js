const { PrismaClient } = require('../src/generated/prisma');
const p = new PrismaClient();

async function main() {
  const conteudos = await p.conteudo.findMany({
    take: 10,
    orderBy: { data: 'desc' },
    select: { id: true, topico: true, planejado: true, data: true, aluno: { select: { nome: true } } }
  });
  console.log(JSON.stringify(conteudos, null, 2));
}

main().finally(() => p.$disconnect());

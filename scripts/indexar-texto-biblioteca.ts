import { prisma } from "../src/lib/prisma";
import { extrairTextoArquivo } from "../src/lib/extrairTextoArquivo";

async function main() {
  const materiais = await prisma.materialBiblioteca.findMany({
    where: { arquivoUrl: { not: "" } },
    select: { id: true, arquivoUrl: true, arquivoNome: true },
  });

  let indexados = 0;
  let semTexto = 0;
  let falhas = 0;

  for (const material of materiais) {
    try {
      const resposta = await fetch(material.arquivoUrl);
      if (!resposta.ok) throw new Error(`download ${resposta.status}`);

      const arquivo = Buffer.from(await resposta.arrayBuffer());
      const tipo = resposta.headers.get("content-type")?.split(";")[0] ?? "";
      const textoBusca = await extrairTextoArquivo(arquivo, tipo, material.arquivoNome ?? material.arquivoUrl);

      await prisma.materialBiblioteca.update({ where: { id: material.id }, data: { textoBusca: textoBusca || null } });
      if (textoBusca) indexados += 1;
      else semTexto += 1;
    } catch (erro) {
      falhas += 1;
      console.error(`Não foi possível indexar o material ${material.id}:`, erro instanceof Error ? erro.message : erro);
    }
  }

  console.log(`Indexação concluída: ${indexados} com texto, ${semTexto} sem texto selecionável, ${falhas} falhas.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

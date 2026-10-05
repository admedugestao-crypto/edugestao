import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const LIMITE_TEXTO_BUSCA = 500_000;

function limparTexto(texto: string) {
  return texto.replace(/\s+/g, " ").trim().slice(0, LIMITE_TEXTO_BUSCA);
}

function extensao(nomeArquivo: string) {
  return nomeArquivo.split(".").pop()?.toLowerCase() ?? "";
}

/** Extrai texto pesquisável sem impedir o envio quando o arquivo não possuir texto selecionável. */
export async function extrairTextoArquivo(
  arquivo: Buffer,
  tipo: string,
  nomeArquivo: string
) {
  const ext = extensao(nomeArquivo);

  try {
    if (tipo === "application/pdf" || ext === "pdf") {
      const parser = new PDFParse({ data: arquivo });
      try {
        const resultado = await parser.getText();
        return limparTexto(resultado.text);
      } finally {
        await parser.destroy();
      }
    }

    if (
      tipo === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx"
    ) {
      const resultado = await mammoth.extractRawText({ buffer: arquivo });
      return limparTexto(resultado.value);
    }
  } catch (erro) {
    console.warn("Não foi possível extrair o texto do arquivo enviado.", erro);
  }

  return "";
}

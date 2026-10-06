import mammoth from "mammoth";
import { tmpdir } from "os";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

const LIMITE_TEXTO_BUSCA = 500_000;

export function normalizarTermoBusca(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function limparTexto(texto: string) {
  const textoLimpo = texto.replace(/\s+/g, " ").trim().slice(0, LIMITE_TEXTO_BUSCA);
  const textoNormalizado = normalizarTermoBusca(textoLimpo);
  return textoNormalizado && textoNormalizado !== textoLimpo ? `${textoLimpo}\n${textoNormalizado}` : textoLimpo;
}

function extensao(nomeArquivo: string) {
  return nomeArquivo.split(".").pop()?.toLowerCase() ?? "";
}

function ehImagem(tipo: string, ext: string) {
  return tipo.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext);
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

    if (ehImagem(tipo, ext)) {
      const imagemPreparada = await sharp(arquivo)
        .rotate()
        .resize({ width: 2_400, withoutEnlargement: false })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer();
      const worker = await createWorker("por", undefined, { cachePath: tmpdir() });
      try {
        const resultado = await worker.recognize(imagemPreparada);
        return limparTexto(resultado.data.text);
      } finally {
        await worker.terminate();
      }
    }
  } catch (erro) {
    console.warn("Não foi possível extrair o texto do arquivo enviado.", erro);
  }

  return "";
}

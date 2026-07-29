// Lógica client-side (usa canvas/createImageBitmap) para juntar vários PDFs
// e/ou imagens selecionados num input de arquivo num único PDF antes do
// upload — extraído do fluxo de anexo da Biblioteca de Apostilas
// (BibliotecaClient.tsx) para reuso em outras telas com o mesmo problema
// (limite de upload menor que a soma dos arquivos originais).
import { PDFDocument } from "pdf-lib";

export const TIPOS_WORD = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Fotos de celular costumam vir enormes (vários MB cada) — juntar 3-4 delas
// num PDF facilmente estoura o limite de upload. Redimensiona pro maior lado
// caber em MAX_LADO e reencoda como JPEG com qualidade reduzida, o que
// derruba bastante o tamanho final sem comprometer a leitura do conteúdo.
const MAX_LADO = 1800;
const QUALIDADE_JPEG = 0.75;

async function comprimirImagem(bytes: ArrayBuffer): Promise<{ bytes: ArrayBuffer; width: number; height: number }> {
  const blob = new Blob([bytes]);
  const bitmap = await createImageBitmap(blob);
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * escala);
  const height = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);

  const jpegBlob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao comprimir imagem."))), "image/jpeg", QUALIDADE_JPEG)
  );
  return { bytes: await jpegBlob.arrayBuffer(), width, height };
}

// O navegador/SO às vezes não preenche file.type (comum com PDF vindo de
// certos apps de scanner ou caminhos de rede/OneDrive) — nesse caso, usa a
// extensão do nome do arquivo como pista.
function tipoReal(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "";
}

// Unifica varios arquivos (PDF e/ou imagem) num unico PDF, um por pagina, na
// ordem em que foram selecionados. Se só vier 1 arquivo, retorna ele mesmo
// sem conversao nenhuma.
export async function unificarArquivos(files: File[], nomeSaida = "material-unificado.pdf"): Promise<File> {
  if (files.length === 1) return files[0];

  const doc = await PDFDocument.create();

  for (const file of files) {
    try {
      const bytes = await file.arrayBuffer();
      const tipo = tipoReal(file);

      if (tipo === "application/pdf") {
        const origem = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const paginas = await doc.copyPages(origem, origem.getPageIndices());
        paginas.forEach((p) => doc.addPage(p));
        continue;
      }

      const comprimida = await comprimirImagem(bytes);
      const imagem = await doc.embedJpg(comprimida.bytes);
      const pagina = doc.addPage([imagem.width, imagem.height]);
      pagina.drawImage(imagem, { x: 0, y: 0, width: imagem.width, height: imagem.height });
    } catch (err) {
      console.error(`Falha ao processar "${file.name}" na unificação:`, err);
      throw new Error(`Não consegui processar o arquivo "${file.name}".`);
    }
  }

  const pdfBytes = new Uint8Array(await doc.save());
  return new File([pdfBytes], nomeSaida, { type: "application/pdf" });
}

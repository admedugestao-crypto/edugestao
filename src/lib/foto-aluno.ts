import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

export class FotoAlunoInvalida extends Error {}

export async function salvarFotoAluno(foto: FormDataEntryValue | null, empresaId: string): Promise<string | undefined> {
  if (foto === null || (foto instanceof File && foto.size === 0)) return undefined;
  if (!(foto instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(foto.type)) {
    throw new FotoAlunoInvalida("Selecione uma foto JPG, PNG ou WebP.");
  }
  if (foto.size > 2 * 1024 * 1024) throw new FotoAlunoInvalida("A foto deve ter no máximo 2 MB.");
  const ext = foto.type === "image/jpeg" ? "jpg" : foto.type === "image/png" ? "png" : "webp";
  const blob = await put(`alunos/${empresaId}/${randomUUID()}.${ext}`, foto, { access: "public", contentType: foto.type });
  return blob.url;
}

export async function descartarFotoAluno(url: string | undefined | null) {
  if (url) await del(url).catch(() => {});
}

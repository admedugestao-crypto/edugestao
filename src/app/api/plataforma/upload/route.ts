import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_TAMANHO = 2 * 1024 * 1024; // 2 MB
const LADO_MAX = 512; // px — normaliza o tamanho para caber bem em qualquer badge/menu

// Upload de logo de empresa — uso exclusivo do papel PLATAFORMA, já que
// /api/upload é escopado por empresaId de sessão (que usuários PLATAFORMA
// não têm).
//
// A imagem é normalizada automaticamente (corta bordas vazias/transparentes
// e redimensiona) pra que logos de proporções e resoluções bem diferentes
// apareçam com tamanho visual consistente nas telas do app, sem exigir que
// quem cadastra a empresa pré-edite o arquivo. SVG é vetor e fica como está.
export async function POST(req: NextRequest) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("arquivo") as File | null;

  if (!file) return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  if (!TIPOS_PERMITIDOS.includes(file.type))
    return NextResponse.json({ erro: "Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou SVG." }, { status: 400 });
  if (file.size > MAX_TAMANHO)
    return NextResponse.json({ erro: "Arquivo muito grande. Máximo 2 MB." }, { status: 400 });

  let corpo: File | Buffer = file;
  let ext = file.name.split(".").pop() ?? "png";
  let contentType = file.type;

  if (file.type !== "image/svg+xml") {
    try {
      const original = Buffer.from(await file.arrayBuffer());
      corpo = await sharp(original)
        .trim() // remove margem uniforme/transparente ao redor do desenho
        .resize({ width: LADO_MAX, height: LADO_MAX, fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      ext = "png";
      contentType = "image/png";
    } catch {
      // Se o processamento falhar por algum motivo (ex.: imagem toda de uma
      // cor só e .trim() não sobra nada), sobe o arquivo original mesmo.
    }
  }

  const nomeArquivo = `logos/${randomUUID()}.${ext}`;

  const blob = await put(nomeArquivo, corpo, { access: "public", contentType });

  return NextResponse.json({ url: blob.url });
}

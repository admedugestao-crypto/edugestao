import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_TAMANHO = 2 * 1024 * 1024; // 2 MB

// Upload de logo de empresa — uso exclusivo do papel PLATAFORMA, já que
// /api/upload é escopado por empresaId de sessão (que usuários PLATAFORMA
// não têm).
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

  const ext = file.name.split(".").pop() ?? "png";
  const nomeArquivo = `logos/${randomUUID()}.${ext}`;

  const blob = await put(nomeArquivo, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}

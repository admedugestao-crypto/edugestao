import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const TIPOS_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_TAMANHO = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("arquivo") as File | null;

  if (!file) return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  if (!TIPOS_PERMITIDOS.includes(file.type))
    return NextResponse.json({ erro: "Tipo de arquivo não permitido. Use PDF, imagem ou Word." }, { status: 400 });
  if (file.size > MAX_TAMANHO)
    return NextResponse.json({ erro: "Arquivo muito grande. Máximo 10 MB." }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "bin";
  const nomeArquivo = `conteudos/${randomUUID()}.${ext}`;

  const blob = await put(nomeArquivo, file, { access: "public" });

  return NextResponse.json({ url: blob.url, nome: file.name });
}

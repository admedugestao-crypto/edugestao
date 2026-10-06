import { NextRequest, NextResponse } from "next/server";
import { getSessionScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  if (!scope.isAdmin) return NextResponse.json({ erro: "Somente administradores podem alterar o ícone." }, { status: 403 });
  try {
    const form = await req.formData();
    const file = form.get("arquivo");
    if (!(file instanceof File) || file.type !== "image/png" || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ erro: "Envie uma imagem PNG de até 2 MB." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(16) !== 256 || bytes.readUInt32BE(20) !== 256) {
      return NextResponse.json({ erro: "O ícone deve ser uma imagem PNG de 256 × 256 pixels." }, { status: 400 });
    }
    const blob = await put(`empresas/${scope.empresaId}/icone-${randomUUID()}.png`, bytes, { access: "public", contentType: "image/png" });
    try {
      await prisma.empresa.update({ where: { id: scope.empresaId }, data: { logoUrl: blob.url } });
    } catch (error) {
      await del(blob.url).catch(() => {});
      throw error;
    }
    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ erro: "Não foi possível salvar o ícone. Tente novamente." }, { status: 500 });
  }
}

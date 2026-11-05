import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { requirePlataforma } from "@/lib/plataforma";
import { diagnosticarSmtp } from "@/lib/diagnosticoSmtp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function resposta(dados: object, status = 200) {
  return NextResponse.json(dados, { status, headers: { "Cache-Control": "no-store" } });
}

// Testa somente as credenciais salvas da empresa solicitada; não envia e-mails.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requirePlataforma())) return resposta({ erro: "Não autorizado." }, 403);
  if (req.headers.get("origin") !== req.nextUrl.origin) return resposta({ erro: "Acesse o teste pela plataforma." }, 403);
  const { id } = await params;
  let etapa: "configuracao" | "smtp" = "configuracao";
  let transporte;
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id }, select: { emailHost: true, emailPort: true, emailUser: true, emailPass: true },
    });
    if (!empresa) return resposta({ erro: "Empresa não encontrada." }, 404);
    const host = empresa.emailHost?.trim();
    const user = empresa.emailUser?.trim();
    const pass = empresa.emailPass?.trim();
    const port = Number(empresa.emailPort?.trim() || "587");
    if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
      return resposta({ erro: "Salve host, porta válida, usuário e senha SMTP desta empresa antes de testar." }, 400);
    }
    etapa = "smtp";
    transporte = nodemailer.createTransport({
      host, port, secure: port === 465, requireTLS: port !== 465,
      auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    await transporte.verify();
    return resposta({ mensagem: "Conexão SMTP desta empresa validada. Nenhum e-mail foi enviado." });
  } catch (falha) {
    const diagnostico = diagnosticarSmtp(falha, etapa);
    console.warn("[teste-smtp-empresa]", { etapa, codigo: diagnostico.codigo });
    return resposta({ ...diagnostico, erro: `${diagnostico.erro} Código: ${diagnostico.codigo}.` }, 502);
  } finally { transporte?.close(); }
}

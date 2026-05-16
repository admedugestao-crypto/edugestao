import { NextRequest, NextResponse } from "next/server";
import { processarNotificacoes, processarNotificacoesEmail } from "@/lib/notificacoes";

// Endpoint chamado pelo cron interno (instrumentation.ts) ou manualmente
// WhatsApp e E-mail executam sequencialmente para evitar race condition no SQLite
export async function POST(req: NextRequest) {
  const cronKey = req.headers.get("x-cron-key");
  if (process.env.CRON_SECRET && cronKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const whatsapp = await processarNotificacoes();
  const email    = await processarNotificacoesEmail();

  return NextResponse.json({ whatsapp, email });
}

export async function GET() {
  const whatsapp = await processarNotificacoes();
  const email    = await processarNotificacoesEmail();

  return NextResponse.json({ whatsapp, email });
}

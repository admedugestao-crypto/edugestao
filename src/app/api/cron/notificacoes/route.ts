import { NextRequest, NextResponse } from "next/server";
import { processarNotificacoes, processarNotificacoesEmail, processarNotificacoesAula, processarVerificacaoFonnte } from "@/lib/notificacoes";
import { autorizarCron } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

// Chamado pelo Vercel Cron Job (vercel.json) ou manualmente.
// A Vercel injeta automaticamente o header Authorization: Bearer <CRON_SECRET>.
export async function POST(req: NextRequest) {
  const auth = autorizarCron(req.headers);
  if (!auth.ok) return NextResponse.json({ erro: auth.erro }, { status: auth.status });

  const whatsapp = await processarNotificacoes();
  const email    = await processarNotificacoesEmail();
  const aulas    = await processarNotificacoesAula();
  const fonnte   = await processarVerificacaoFonnte();

  return NextResponse.json({ whatsapp, email, aulas, fonnte });
}

// GET: usado pelo Vercel Cron e permitido apenas com CRON_SECRET válido.
export async function GET(req: NextRequest) {
  const auth = autorizarCron(req.headers);
  if (!auth.ok) return NextResponse.json({ erro: auth.erro }, { status: auth.status });

  const whatsapp = await processarNotificacoes();
  const email    = await processarNotificacoesEmail();
  const aulas    = await processarNotificacoesAula();
  const fonnte   = await processarVerificacaoFonnte();

  return NextResponse.json({ whatsapp, email, aulas, fonnte });
}

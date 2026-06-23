import { NextRequest, NextResponse } from "next/server";
import { processarNotificacoes, processarNotificacoesEmail, processarNotificacoesAula } from "@/lib/notificacoes";

export const dynamic = "force-dynamic";

// Chamado pelo Vercel Cron Job (vercel.json) ou manualmente.
// A Vercel injeta automaticamente o header Authorization: Bearer <CRON_SECRET>.
export async function POST(req: NextRequest) {
  // Vercel Cron Job envia Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  const cronKey    = req.headers.get("x-cron-key");
  const secret     = process.env.CRON_SECRET;

  if (secret) {
    const bearerOk = authHeader === `Bearer ${secret}`;
    const keyOk    = cronKey === secret;
    if (!bearerOk && !keyOk) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }
  }

  const whatsapp = await processarNotificacoes();
  const email    = await processarNotificacoesEmail();
  const aulas    = await processarNotificacoesAula();

  return NextResponse.json({ whatsapp, email, aulas });
}

// GET: permite disparar manualmente pelo browser (apenas com CRON_SECRET ou sem segredo)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronKey    = req.headers.get("x-cron-key");
  const secret     = process.env.CRON_SECRET;

  if (secret) {
    const bearerOk = authHeader === `Bearer ${secret}`;
    const keyOk    = cronKey === secret;
    if (!bearerOk && !keyOk) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }
  }

  const whatsapp = await processarNotificacoes();
  const email    = await processarNotificacoesEmail();
  const aulas    = await processarNotificacoesAula();

  return NextResponse.json({ whatsapp, email, aulas });
}

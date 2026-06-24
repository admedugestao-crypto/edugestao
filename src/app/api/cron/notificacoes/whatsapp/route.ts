import { NextRequest, NextResponse } from "next/server";
import { processarNotificacoes, processarNotificacoesAula } from "@/lib/notificacoes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

  const provas = await processarNotificacoes();
  const aulas  = await processarNotificacoesAula();

  return NextResponse.json({ provas, aulas });
}

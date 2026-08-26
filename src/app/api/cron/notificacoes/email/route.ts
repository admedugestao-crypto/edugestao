import { NextRequest, NextResponse } from "next/server";
import { processarNotificacoesEmail } from "@/lib/notificacoes";
import { autorizarCron } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = autorizarCron(req.headers);
  if (!auth.ok) return NextResponse.json({ erro: auth.erro }, { status: auth.status });

  const email = await processarNotificacoesEmail();

  return NextResponse.json({ email });
}

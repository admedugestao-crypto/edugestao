import { NextRequest, NextResponse } from "next/server";
import { processarNotificacoes, processarNotificacoesAula } from "@/lib/notificacoes";
import { autorizarCron } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = autorizarCron(req.headers);
  if (!auth.ok) return NextResponse.json({ erro: auth.erro }, { status: auth.status });

  const provas = await processarNotificacoes();
  const aulas  = await processarNotificacoesAula();

  return NextResponse.json({ provas, aulas });
}

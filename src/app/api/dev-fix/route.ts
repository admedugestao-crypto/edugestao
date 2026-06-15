import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await prisma.pagamentoAula.deleteMany({});
  const { count } = await prisma.pagamento.deleteMany({});
  return NextResponse.json({ excluido: count });
}

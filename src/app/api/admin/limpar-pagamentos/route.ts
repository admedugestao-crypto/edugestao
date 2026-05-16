import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Rota temporária de uso único — remover após execução
export async function GET() {
  const session = await auth();
  const perfil = (session?.user as any)?.perfil;
  if (perfil !== "SUPERADMIN")
    return NextResponse.json({ erro: "Apenas SUPERADMIN" }, { status: 403 });

  const { count } = await prisma.pagamento.deleteMany({});
  return NextResponse.json({ excluidos: count, mensagem: "Pagamentos excluídos com sucesso." });
}

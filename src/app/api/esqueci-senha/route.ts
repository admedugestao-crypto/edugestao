import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { enviarEmailRedefinirSenha, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

// Sempre responde com sucesso genérico, mesmo se o e-mail não existir —
// evita que alguém use esta rota para descobrir quais e-mails têm conta.
const RESPOSTA_GENERICA = {
  ok: true,
  mensagem: "Se este e-mail estiver cadastrado, você vai receber um link de redefinição em instantes.",
};

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ erro: "Informe um e-mail." }, { status: 400 });
  }

  const usuario = await prisma.usuario.findFirst({
    where: { email, perfil: { not: "PLATAFORMA" }, ativo: true },
  });

  if (!usuario) {
    return NextResponse.json(RESPOSTA_GENERICA);
  }

  const resetToken = randomBytes(32).toString("hex");
  const resetTokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { resetToken, resetTokenExpira },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const link = `${baseUrl}/redefinir-senha?token=${resetToken}`;

  const empresa = usuario.empresaId
    ? await prisma.empresa.findUnique({
        where: { id: usuario.empresaId },
        select: { emailHost: true, emailPort: true, emailUser: true, emailPass: true, emailFrom: true },
      })
    : null;

  if (empresa && emailConfigurado(empresa)) {
    await enviarEmailRedefinirSenha({
      emailUsuario: usuario.email,
      nomeUsuario: usuario.nome,
      link,
    }, empresa);
    return NextResponse.json(RESPOSTA_GENERICA);
  }

  // Sem SMTP configurado pra essa empresa — em produção NÃO expõe o link na
  // resposta (agora que o SMTP é por empresa, uma empresa sem configuração
  // ainda pode acontecer em prod, diferente de quando era env var global
  // sempre presente). Só em dev devolve o link direto, pra testar o fluxo
  // sem e-mail real.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ...RESPOSTA_GENERICA, linkDev: link });
  }
  return NextResponse.json(RESPOSTA_GENERICA);
}

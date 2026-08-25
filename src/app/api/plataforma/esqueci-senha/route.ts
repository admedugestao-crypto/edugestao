import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { enviarEmailRedefinirSenha, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

// Sempre responde com sucesso genérico, mesmo se o e-mail não existir —
// evita que alguém use esta rota para descobrir quais e-mails têm conta.
const RESPOSTA_GENERICA = {
  ok: true,
  mensagem: "Se este e-mail estiver cadastrado na plataforma, você vai receber um link de redefinição em instantes.",
};

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ erro: "Informe um e-mail." }, { status: 400 });
  }

  const usuario = await prisma.usuario.findFirst({
    where: { email, perfil: "PLATAFORMA", ativo: true },
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
  const link = `${baseUrl}/redefinir-senha?token=${resetToken}&plataforma=1`;

  // Usuário PLATAFORMA não pertence a nenhuma empresa — continua usando o
  // SMTP global do sistema (env vars), diferente do fluxo de empresa acima.
  const credenciaisGlobais = {
    emailHost: process.env.EMAIL_HOST,
    emailPort: process.env.EMAIL_PORT,
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    emailFrom: process.env.EMAIL_FROM,
  };

  if (emailConfigurado(credenciaisGlobais)) {
    const resultadoEnvio = await enviarEmailRedefinirSenha({
      emailUsuario: usuario.email,
      nomeUsuario: usuario.nome,
      link,
    }, credenciaisGlobais);

    if (!resultadoEnvio.ok) {
      console.error("Falha ao enviar e-mail de redefinição da plataforma:", resultadoEnvio.erro);
      return NextResponse.json(
        { erro: "Não foi possível enviar o e-mail agora. Verifique a configuração de envio ou tente novamente mais tarde." },
        { status: 502 },
      );
    }

    return NextResponse.json(RESPOSTA_GENERICA);
  }

  // Sem SMTP configurado, o ambiente dev devolve o link para permitir o teste.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ...RESPOSTA_GENERICA, linkDev: link });
  }

  console.error("SMTP global não configurado para recuperação de senha da plataforma.");
  return NextResponse.json(
    { erro: "O envio de e-mail não está configurado. Contate o suporte da plataforma." },
    { status: 503 },
  );
}

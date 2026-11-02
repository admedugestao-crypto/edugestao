import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decifrarSenhaEmail } from "@/lib/parametrizacaoEmail";
import { mensagemConfirmacaoInscricao } from "@/lib/emailConfirmacaoInscricao";

export async function obterEmailPlataforma() {
  const configuracao = await prisma.parametrizacaoPlataforma.findUnique({ where: { id: "geral" } });
  if (!configuracao) throw new Error("Configure o e-mail em Parametrização Geral.");
  return {
    host: configuracao.emailHost,
    port: configuracao.emailPort,
    user: configuracao.emailUser,
    pass: decifrarSenhaEmail(configuracao.emailSenhaCifrada, process.env.NEXTAUTH_SECRET ?? ""),
    from: configuracao.emailFrom || configuracao.emailUser,
  };
}

export function transporteEmailPlataforma(configuracao: Awaited<ReturnType<typeof obterEmailPlataforma>>) {
  return nodemailer.createTransport({
    host: configuracao.host, port: configuracao.port,
    secure: configuracao.port === 465,
    requireTLS: configuracao.port !== 465,
    auth: { user: configuracao.user, pass: configuracao.pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
}

export async function enviarConfirmacaoInscricao(inscricao: { nome: string; email: string }) {
  const configuracao = await obterEmailPlataforma();
  const transporte = transporteEmailPlataforma(configuracao);
  try {
    await transporte.sendMail({
      from: configuracao.from,
      to: inscricao.email,
      ...mensagemConfirmacaoInscricao(inscricao.nome),
    });
  } finally { transporte.close(); }
}

// Cada responsável recebe uma mensagem individual, sem expor outros destinatários.
// O chamador deve autorizar a operação; este serviço não dispara mensagens sozinho.
export async function enviarEmailResponsaveisEmpresa(empresaId: string, mensagem: { assunto: string; texto: string }) {
  if (!mensagem.assunto.trim() || /[\r\n]/.test(mensagem.assunto) || !mensagem.texto.trim()) {
    throw new Error("Informe o assunto e o conteúdo da mensagem.");
  }
  const responsaveis = await prisma.usuario.findMany({
    where: { empresaId, perfil: "SUPERADMIN", ativo: true, empresa: { ativo: true } },
    select: { email: true },
  });
  const destinos = [...new Set(responsaveis.map((usuario) => usuario.email))];
  if (!destinos.length) throw new Error("A empresa não possui responsável ativo com e-mail cadastrado.");
  const configuracao = await obterEmailPlataforma();
  const transporte = transporteEmailPlataforma(configuracao);
  let enviados = 0;
  try {
    for (const to of destinos) {
      await transporte.sendMail({ from: configuracao.from, to, subject: mensagem.assunto, text: mensagem.texto });
      enviados++;
    }
    return { enviados };
  } finally { transporte.close(); }
}

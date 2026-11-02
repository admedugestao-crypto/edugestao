import { NextRequest, NextResponse } from "next/server";
import { requirePlataforma } from "@/lib/plataforma";
import { prisma } from "@/lib/prisma";
import { cifrarSenhaEmail, parametrizacaoEmailSchema } from "@/lib/parametrizacaoEmail";
import { obterEmailPlataforma, transporteEmailPlataforma } from "@/lib/emailPlataforma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resposta(dados: object, status = 200) {
  return NextResponse.json(dados, { status, headers: { "Cache-Control": "no-store" } });
}
function mesmaOrigem(req: NextRequest) {
  return req.headers.get("origin") === req.nextUrl.origin;
}

export async function GET() {
  if (!(await requirePlataforma())) return resposta({ erro: "Não autorizado." }, 403);
  try {
    const configuracao = await prisma.parametrizacaoPlataforma.findUnique({
      where: { id: "geral" },
      select: { emailHost: true, emailPort: true, emailUser: true, emailFrom: true, atualizadoEm: true },
    });
    return resposta({ configuracao, senhaConfigurada: Boolean(configuracao) });
  } catch {
    return resposta({ erro: "Não foi possível carregar a parametrização. Tente novamente." }, 503);
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requirePlataforma())) return resposta({ erro: "Não autorizado." }, 403);
  if (!mesmaOrigem(req)) return resposta({ erro: "Acesse a configuração pela plataforma." }, 403);
  if (Number(req.headers.get("content-length") ?? 0) > 8000) return resposta({ erro: "Dados excedem o limite permitido." }, 413);
  let dados;
  try { dados = parametrizacaoEmailSchema.safeParse(await req.json()); }
  catch { return resposta({ erro: "Dados inválidos." }, 400); }
  if (!dados.success) return resposta({ erro: dados.error.issues[0].message }, 400);
  try {
    const { emailPass, ...campos } = dados.data;
    const existente = await prisma.parametrizacaoPlataforma.findUnique({ where: { id: "geral" }, select: { id: true } });
    if (!existente && !emailPass) return resposta({ erro: "Informe a senha SMTP no primeiro cadastro." }, 400);
    const segredo = process.env.NEXTAUTH_SECRET;
    if (!segredo) return resposta({ erro: "A configuração segura da plataforma está indisponível." }, 503);
    const senha = emailPass ? { emailSenhaCifrada: cifrarSenhaEmail(emailPass, segredo) } : {};
    const camposSalvos = { ...campos, emailFrom: campos.emailFrom || null };
    await prisma.parametrizacaoPlataforma.upsert({
      where: { id: "geral" },
      update: { ...camposSalvos, ...senha },
      create: { id: "geral", ...camposSalvos, emailSenhaCifrada: senha.emailSenhaCifrada! },
    });
    return resposta({ mensagem: "Configuração de e-mail salva.", senhaConfigurada: true });
  } catch {
    return resposta({ erro: "Não foi possível salvar a configuração. Tente novamente." }, 503);
  }
}

// Verifica somente a conexão e a autenticação; não envia mensagem.
export async function POST(req: NextRequest) {
  if (!(await requirePlataforma())) return resposta({ erro: "Não autorizado." }, 403);
  if (!mesmaOrigem(req)) return resposta({ erro: "Acesse a configuração pela plataforma." }, 403);
  let transporte;
  try {
    transporte = transporteEmailPlataforma(await obterEmailPlataforma());
    await transporte.verify();
    return resposta({ mensagem: "Conexão SMTP validada. Nenhum e-mail foi enviado." });
  } catch {
    return resposta({ erro: "Não foi possível validar o SMTP. Confira os dados salvos e a liberação de acesso no provedor." }, 502);
  } finally { transporte?.close(); }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

// Atualiza dados de uma empresa: ativa/desativa (empresa inativa não consegue
// mais logar) e/ou edita nome/código/logo (slug usado na 1ª etapa do login).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const data: {
    ativo?: boolean; nome?: string; slug?: string; logoUrl?: string | null;
    fonnteToken?: string | null;
    evolutionApiUrl?: string | null; evolutionApiKey?: string | null; evolutionApiInstance?: string | null;
    emailHost?: string | null; emailPort?: string | null; emailUser?: string | null;
    emailPass?: string | null; emailFrom?: string | null;
    cep?: string | null; logradouro?: string | null; numero?: string | null;
    complemento?: string | null; bairro?: string | null; cidade?: string | null;
    estado?: string | null; codigoIbge?: string | null;
  } = {};

  if (typeof body.ativo === "boolean") data.ativo = body.ativo;

  if (typeof body.nome === "string") {
    if (!body.nome.trim()) return NextResponse.json({ erro: "Nome não pode ser vazio." }, { status: 400 });
    data.nome = body.nome.trim();
  }

  if (typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (!slug) return NextResponse.json({ erro: "Código inválido." }, { status: 400 });
    const existente = await prisma.empresa.findUnique({ where: { slug } });
    if (existente && existente.id !== id) {
      return NextResponse.json({ erro: "Este código já está em uso por outra empresa." }, { status: 409 });
    }
    data.slug = slug;
  }

  if (typeof body.logoUrl === "string" || body.logoUrl === null) {
    data.logoUrl = body.logoUrl;
  }

  // Credenciais de WhatsApp — string vazia é normalizada pra null (campo
  // "desmarcado"), já que o front sempre manda string mesmo quando limpo.
  if (typeof body.fonnteToken === "string") data.fonnteToken = body.fonnteToken.trim() || null;
  if (typeof body.evolutionApiUrl === "string") data.evolutionApiUrl = body.evolutionApiUrl.trim() || null;
  if (typeof body.evolutionApiKey === "string") data.evolutionApiKey = body.evolutionApiKey.trim() || null;
  if (typeof body.evolutionApiInstance === "string") data.evolutionApiInstance = body.evolutionApiInstance.trim() || null;

  // Credenciais de SMTP — mesmo tratamento de string vazia → null.
  if (typeof body.emailHost === "string") data.emailHost = body.emailHost.trim() || null;
  if (typeof body.emailPort === "string") data.emailPort = body.emailPort.trim() || null;
  if (typeof body.emailUser === "string") data.emailUser = body.emailUser.trim() || null;
  if (typeof body.emailPass === "string") data.emailPass = body.emailPass.trim() || null;
  if (typeof body.emailFrom === "string") data.emailFrom = body.emailFrom.trim() || null;

  if (typeof body.cep === "string") data.cep = body.cep.trim() || null;
  if (typeof body.logradouro === "string") data.logradouro = body.logradouro.trim() || null;
  if (typeof body.numero === "string") data.numero = body.numero.trim() || null;
  if (typeof body.complemento === "string") data.complemento = body.complemento.trim() || null;
  if (typeof body.bairro === "string") data.bairro = body.bairro.trim() || null;
  if (typeof body.cidade === "string") data.cidade = body.cidade.trim() || null;
  if (typeof body.estado === "string") data.estado = body.estado.trim().toUpperCase() || null;
  if (typeof body.codigoIbge === "string") data.codigoIbge = body.codigoIbge.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ erro: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({ where: { id }, data });
  return NextResponse.json(empresa);
}

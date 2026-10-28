import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONFIRMACAO_INSCRICAO, inscricaoTesteSchema, VERSAO_CONSENTIMENTO } from "@/lib/inscricaoTeste";

export const runtime = "nodejs";
const sucesso = () => NextResponse.json({ mensagem: CONFIRMACAO_INSCRICAO }, { status: 201 });

export async function POST(req: NextRequest) {
  const origem = req.headers.get("origin");
  if (origem && origem !== req.nextUrl.origin) {
    return NextResponse.json({ erro: "Envie a inscrição pela página do EG V2." }, { status: 403 });
  }
  let body: unknown;
  try {
    // Limita também requisições sem Content-Length, antes de processar JSON.
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ erro: "Preencha o formulário." }, { status: 400 });
    const partes: Uint8Array[] = [];
    let tamanho = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      tamanho += value.byteLength;
      if (tamanho > 12000) {
        await reader.cancel();
        return NextResponse.json({ erro: "O formulário excedeu o tamanho permitido." }, { status: 413 });
      }
      partes.push(value);
    }
    body = JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch {
    return NextResponse.json({ erro: "Não foi possível ler o formulário. Tente novamente." }, { status: 400 });
  }
  if (body && typeof body === "object" && "site" in body && body.site) return sucesso();
  const validacao = inscricaoTesteSchema.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: validacao.error.issues[0].message }, { status: 400 });
  }
  const segredo = process.env.NEXTAUTH_SECRET;
  if (!segredo) return NextResponse.json({ erro: "Inscrições temporariamente indisponíveis. Tente novamente mais tarde." }, { status: 503 });
  // A Vercel sobrescreve este cabeçalho. Fora dela, o limite é compartilhado.
  const ip = process.env.VERCEL ? req.headers.get("x-vercel-forwarded-for") ?? "compartilhado" : "local";
  const origemHash = createHmac("sha256", segredo).update(`${new Date().toISOString().slice(0, 10)}:${ip}`).digest("hex");
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Serializa o limite por origem mesmo com múltiplas instâncias do servidor.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${origemHash}))`;
      const recentes = await tx.inscricaoTeste.count({ where: { origemHash, criadoEm: { gte: new Date(Date.now() - 3600000) } } });
      if (recentes >= 5) return "limite";
      const { nome, email, whatsapp, materias, quantidadeAlunos, organizacao, dificuldade, disponibilidade } = validacao.data;
      const dados = { nome, email, whatsapp, materias, quantidadeAlunos, organizacao, dificuldade, disponibilidade };
      const existente = await tx.inscricaoTeste.findFirst({ where: { OR: [{ whatsapp: dados.whatsapp }, { email: dados.email }] }, select: { id: true } });
      if (!existente) {
        await tx.inscricaoTeste.create({ data: { ...dados, origemHash, versaoConsentimento: VERSAO_CONSENTIMENTO } });
      }
      return "ok";
    });
    if (resultado === "limite") return NextResponse.json({ erro: "Muitas inscrições nesta conexão. Tente novamente em uma hora." }, { status: 429, headers: { "Retry-After": "3600" } });
    return sucesso();
  } catch (error) {
    // Não revela se um telefone já está cadastrado nem sobrescreve o candidato.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return sucesso();
    console.error("Não foi possível salvar uma inscrição do teste EG V2.");
    return NextResponse.json({ erro: "Não foi possível concluir sua inscrição. Seus dados continuam no formulário. Tente novamente." }, { status: 503 });
  }
}

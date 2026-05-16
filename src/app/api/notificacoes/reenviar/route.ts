import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { montarMensagem, formatarWhatsapp } from "@/lib/notificacoes";
import { enviarEmailProva, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

async function enviarZAPI(numero: string, mensagem: string): Promise<boolean> {
  const instanceId   = process.env.ZAPI_INSTANCE_ID;
  const token        = process.env.ZAPI_TOKEN;
  const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
  if (!instanceId || !token) return false;
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clientToken ? { "Client-Token": clientToken } : {}),
        },
        body: JSON.stringify({ phone: numero, message: mensagem }),
      }
    );
    return res.ok;
  } catch { return false; }
}

async function enviarEvolution(numero: string, mensagem: string): Promise<boolean> {
  const url      = process.env.EVOLUTION_API_URL;
  const apiKey   = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!url || !apiKey || !instance) return false;
  try {
    const res = await fetch(`${url}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number: numero, text: mensagem }),
    });
    return res.ok;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id, canal } = await req.json() as { id: string; canal: "whatsapp" | "email" };
  if (!id || !canal) return NextResponse.json({ erro: "id e canal são obrigatórios" }, { status: 400 });

  // Busca o registro completo
  const registro = await prisma.notificacaoProva.findUnique({
    where: { id },
    include: {
      professora: { include: { usuario: { select: { nome: true, email: true, whatsapp: true } } } },
      avaliacao: {
        include: { unidade: { include: { escola: true } }, materia: true },
      },
    },
  });

  if (!registro) return NextResponse.json({ erro: "Registro não encontrado" }, { status: 404 });

  const av   = registro.avaliacao;
  const prof = registro.professora;
  const dataProva = new Date(av.data); dataProva.setHours(0, 0, 0, 0);
  const hoje      = new Date();        hoje.setHours(0, 0, 0, 0);
  const diasRestantes = Math.max(0, Math.round((dataProva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));

  // Busca alunos da turma para montar a mensagem
  const alunos = await prisma.aluno.findMany({
    where: { professoraId: prof.id, unidadeId: av.unidadeId, serie: av.serie, status: "ATIVO" },
    select: { nome: true },
    orderBy: { nome: "asc" },
  });
  const nomesAlunos = alunos.map((a) => a.nome);

  if (canal === "whatsapp") {
    const whatsapp = registro.whatsapp ?? prof.usuario.whatsapp;
    if (!whatsapp) return NextResponse.json({ erro: "Número de WhatsApp não disponível." }, { status: 422 });

    const numero   = formatarWhatsapp(whatsapp);
    const mensagem = montarMensagem({
      nomeProfessor: prof.usuario.nome,
      nomeAvaliacao: av.nome,
      nomeMateria:   av.materia?.nome ?? null,
      nomeEscola:    av.unidade.escola.nome,
      nomeUnidade:   av.unidade.nome,
      serie:         av.serie,
      dataProva,
      diasRestantes,
      nomesAlunos,
    });

    const zapiConf      = !!(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN);
    const evolutionConf = !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE);

    let enviada = false;
    if (zapiConf)      enviada = await enviarZAPI(numero, mensagem);
    else if (evolutionConf) enviada = await enviarEvolution(numero, mensagem);

    if (!enviada) return NextResponse.json({ erro: "Falha ao enviar via WhatsApp. Verifique a configuração da API." }, { status: 500 });

    await prisma.notificacaoProva.update({ where: { id }, data: { enviada: true, whatsapp: numero } });
    return NextResponse.json({ ok: true, canal: "whatsapp" });
  }

  if (canal === "email") {
    const emailDest = registro.email ?? prof.usuario.email;
    if (!emailDest) return NextResponse.json({ erro: "E-mail do professor não disponível." }, { status: 422 });
    if (!emailConfigurado()) return NextResponse.json({ erro: "SMTP não configurado no servidor." }, { status: 503 });

    const { ok, erro } = await enviarEmailProva({
      emailProfessor: emailDest,
      nomeProfessor:  prof.usuario.nome,
      nomeAvaliacao:  av.nome,
      nomeMateria:    av.materia?.nome ?? null,
      nomeEscola:     av.unidade.escola.nome,
      nomeUnidade:    av.unidade.nome,
      serie:          av.serie,
      dataProva,
      diasRestantes,
      nomesAlunos,
    });

    if (!ok) return NextResponse.json({ erro: erro ?? "Falha ao enviar e-mail." }, { status: 500 });

    await prisma.notificacaoProva.update({ where: { id }, data: { emailEnviado: true, email: emailDest } });
    return NextResponse.json({ ok: true, canal: "email" });
  }

  return NextResponse.json({ erro: "Canal inválido." }, { status: 400 });
}

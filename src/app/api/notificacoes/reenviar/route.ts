import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { montarMensagem, formatarWhatsapp, enviarWhatsapp } from "@/lib/notificacoes";
import { enviarEmailProva, emailConfigurado } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id, canal, tipo } = await req.json() as { id: string; canal: "whatsapp" | "email"; tipo?: "prova" | "aula" };
  if (!id || !canal) return NextResponse.json({ erro: "id e canal são obrigatórios" }, { status: 400 });

  if (tipo === "aula") return reenviarAula(id, canal, scope.empresaId);

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

  if (!registro || registro.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Registro não encontrado" }, { status: 404 });
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: scope.empresaId },
    select: { nome: true, fonnteToken: true, evolutionApiUrl: true, evolutionApiKey: true, evolutionApiInstance: true },
  });

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
      nomeEmpresa:   empresa.nome,
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

    const envio = await enviarWhatsapp(numero, mensagem, empresa);

    if (!envio.ok) return NextResponse.json({ erro: `Falha ao enviar via WhatsApp: ${envio.erro}` }, { status: 500 });

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

// Lembrete de aula pro responsável do aluno — so tem canal WhatsApp (sem
// e-mail nesse fluxo). `id` aqui e o id da AgendaAula, nao da notificacao -
// assim funciona tanto pra reenviar quanto pra mandar pela 1a vez manualmente
// (a notificacao pode ainda nao existir se o cron nao rodou pra essa aula).
async function reenviarAula(agendaAulaId: string, canal: "whatsapp" | "email", empresaId: string) {
  if (canal !== "whatsapp") {
    return NextResponse.json({ erro: "Lembrete de aula só pode ser enviado por WhatsApp." }, { status: 400 });
  }

  const aula = await prisma.agendaAula.findUnique({
    where: { id: agendaAulaId },
    include: {
      aluno: true,
      professora: { include: { usuario: { select: { nome: true } } } },
      materia: true,
      empresa: { select: { nome: true, fonnteToken: true, evolutionApiUrl: true, evolutionApiKey: true, evolutionApiInstance: true } },
    },
  });

  if (!aula || aula.empresaId !== empresaId) {
    return NextResponse.json({ erro: "Aula não encontrada." }, { status: 404 });
  }

  if (!aula.aluno.telefoneResponsavel) {
    return NextResponse.json({ erro: "Responsável sem WhatsApp cadastrado." }, { status: 422 });
  }

  const numero = formatarWhatsapp(aula.aluno.telefoneResponsavel);

  const dataFormatada = new Date(aula.data).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });
  const horario = aula.horaInicio
    ? aula.horaFim ? `${aula.horaInicio} – ${aula.horaFim}` : aula.horaInicio
    : "horário a confirmar";

  const mensagem = [
    `📚 *${aula.empresa.nome} – Lembrete de Aula*`,
    ``,
    `Olá${aula.aluno.responsavel ? `, *${aula.aluno.responsavel}*` : ""}!`,
    ``,
    `⚠️ A(o) *${aula.aluno.nome}* tem aula agendada:`,
    ``,
    ...(aula.materia ? [`📖 *Disciplina:* ${aula.materia.nome}`] : []),
    `📆 *Data:* ${dataFormatada}`,
    `🕐 *Horário:* ${horario}`,
    `👩‍🏫 *Professor(a):* ${aula.professora.usuario.nome}`,
    ``,
    `_Mensagem automática de ${aula.empresa.nome} via EduGestão_`,
  ].join("\n");

  const envio = await enviarWhatsapp(numero, mensagem, aula.empresa);
  if (!envio.ok) return NextResponse.json({ erro: `Falha ao enviar via WhatsApp: ${envio.erro}` }, { status: 500 });

  await prisma.notificacaoAula.upsert({
    where: { agendaAulaId },
    update: { enviada: true, whatsapp: numero },
    create: { empresaId, agendaAulaId, enviada: true, whatsapp: numero },
  });

  return NextResponse.json({ ok: true, canal: "whatsapp" });
}

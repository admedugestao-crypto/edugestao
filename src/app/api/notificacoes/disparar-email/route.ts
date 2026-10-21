import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { enviarNotificacaoConteudoMinistrado, processarNotificacoesEmail } from "@/lib/notificacoes";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  if (!scope.isAdmin) return NextResponse.json({ erro: "Acesso restrito a administradores." }, { status: 403 });

  const empresa = await prisma.empresa.findUnique({
    where: { id: scope.empresaId },
    select: { ativo: true, emailPausado: true, alertasConteudoPausados: true },
  });
  if (!empresa?.ativo) return NextResponse.json({ erro: "Empresa não está ativa." }, { status: 403 });
  if (empresa.emailPausado) return NextResponse.json({ erro: "O canal de e-mail está pausado." }, { status: 423 });

  // Datas de aula são armazenadas à meia-noite UTC. O dia vigente é o de Brasília.
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((item) => item.type === tipo)!.value;
  const inicio = new Date(`${parte("year")}-${parte("month")}-${parte("day")}T00:00:00.000Z`);
  const fim = new Date(inicio.getTime() + 86_400_000);
  const conteudos = { enviadas: 0, ignoradas: 0, erros: [] as string[], restantes: 0 };
  if (!empresa.alertasConteudoPausados) {
    const where = {
      empresaId: scope.empresaId,
      planejado: false,
      data: { gte: inicio, lt: fim },
      aula: { is: { empresaId: scope.empresaId, status: "REALIZADA" as const } },
      OR: [{ notificacao: { is: null } }, { notificacao: { is: { enviada: false } } }],
    };
    const pendentes = await prisma.conteudo.findMany({
      where, select: { id: true, aluno: { select: { nome: true } } }, orderBy: { criadoEm: "asc" }, take: 20,
    });
    for (const conteudo of pendentes) {
      try {
        const resultado = await enviarNotificacaoConteudoMinistrado(conteudo.id);
        if (resultado.ignorado) conteudos.ignoradas++;
        else if (resultado.ok) conteudos.enviadas++;
        else conteudos.erros.push(`${conteudo.aluno.nome}: ${resultado.erro ?? "Falha no envio."}`);
      } catch {
        conteudos.erros.push(`${conteudo.aluno.nome}: não foi possível concluir o envio.`);
      }
    }
    conteudos.restantes = Math.max(0, (await prisma.conteudo.count({ where })) - conteudos.erros.length);
  }
  let email;
  try {
    email = await processarNotificacoesEmail(scope.empresaId);
  } catch {
    email = { enviadas: 0, erros: ["Não foi possível concluir os lembretes de provas."] };
  }
  return NextResponse.json({ email, conteudos, conteudosPausados: empresa.alertasConteudoPausados });
}

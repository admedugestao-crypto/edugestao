import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

export const dynamic = "force-dynamic";

import { validarDisponibilidade } from "@/lib/validarDisponibilidade";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  if (!scope.isAdmin) return NextResponse.json({ erro: "Apenas administradores podem alterar disponibilidades." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const erro = validarDisponibilidade(body?.disponibilidade);
  if (erro) return NextResponse.json({ erro }, { status: 400 });

  const professora = await prisma.professora.findFirst({ where: { id, empresaId: scope.empresaId }, select: { id: true, disponibilidade: true } });
  if (!professora) return NextResponse.json({ erro: "Professor não encontrado." }, { status: 404 });

  type Faixa = { dia: string; inicio: string; fim: string };
  const anteriores = (Array.isArray(professora.disponibilidade) ? professora.disponibilidade : []) as Faixa[];
  const novas = body.disponibilidade as Faixa[];
  const removidas = anteriores.filter(a => !novas.some(n => n.dia === a.dia && n.inicio <= a.inicio && n.fim >= a.fim));
  if (removidas.length) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const aulas = await prisma.agendaAula.findMany({ where: { empresaId: scope.empresaId, professoraId: id, status: "AGENDADA", data: { gte: hoje } }, select: { data: true, horaInicio: true, horaFim: true } });
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const conflito = aulas.find(a => removidas.some(f => f.dia === dias[a.data.getUTCDay()] && (!a.horaInicio || !a.horaFim || (a.horaInicio < f.fim && a.horaFim > f.inicio))));
    if (conflito) return NextResponse.json({ erro: "Não é possível excluir ou reduzir este horário: existem aulas agendadas nessa faixa. Reagende ou cancele essas aulas antes de alterar a disponibilidade." }, { status: 409 });
  }
  if (body.validarApenas === true) return NextResponse.json({ ok: true });
  await prisma.professora.update({ where: { id }, data: { disponibilidade: body.disponibilidade } });
  return NextResponse.json({ ok: true });
}

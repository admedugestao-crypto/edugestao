import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";

const DIAS = new Set(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]);
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

type Horario = { dia: string; inicio: string; fim: string };

function validar(disponibilidade: unknown): string | null {
  if (!Array.isArray(disponibilidade)) return "Disponibilidade inválida.";
  const horarios = disponibilidade as Horario[];
  for (let i = 0; i < horarios.length; i++) {
    const h = horarios[i];
    if (!h || !DIAS.has(h.dia) || !HORA.test(h.inicio) || !HORA.test(h.fim)) return "Preencha dias e horários válidos.";
    if (h.inicio >= h.fim) return `Hora final deve ser maior que a inicial em ${h.dia}.`;
    for (let j = i + 1; j < horarios.length; j++) {
      const outro = horarios[j];
      if (h.dia === outro.dia && h.inicio < outro.fim && outro.inicio < h.fim) {
        return `Existem horários sobrepostos em ${h.dia}.`;
      }
    }
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  if (!scope.isAdmin) return NextResponse.json({ erro: "Apenas administradores podem alterar disponibilidades." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const erro = validar(body.disponibilidade);
  if (erro) return NextResponse.json({ erro }, { status: 400 });

  const professora = await prisma.professora.findFirst({ where: { id, empresaId: scope.empresaId }, select: { id: true } });
  if (!professora) return NextResponse.json({ erro: "Professor não encontrado." }, { status: 404 });

  await prisma.professora.update({ where: { id }, data: { disponibilidade: body.disponibilidade } });
  return NextResponse.json({ ok: true });
}

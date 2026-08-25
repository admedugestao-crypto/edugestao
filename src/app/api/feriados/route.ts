import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { obterFeriadosBrasil, type Feriado } from "@/lib/feriados";

export const dynamic = "force-dynamic";

function isoData(data: Date) {
  return data.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const ano = Number(req.nextUrl.searchParams.get("ano"));
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return NextResponse.json({ erro: "Ano inválido" }, { status: 400 });
  }

  const [empresa, feriadosLocais] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: scope.empresaId },
      select: { cidade: true, estado: true, codigoIbge: true },
    }),
    prisma.calendarioEscolar.findMany({
      where: {
        empresaId: scope.empresaId,
        tipo: "FERIADO",
        dataInicio: { lte: new Date(Date.UTC(ano, 11, 31, 23, 59, 59)) },
        dataFim: { gte: new Date(Date.UTC(ano, 0, 1)) },
      },
      select: { titulo: true, dataInicio: true, dataFim: true },
    }),
  ]);

  const calculados = await obterFeriadosBrasil(ano, empresa?.estado, empresa?.cidade, empresa?.codigoIbge);
  const locais: Feriado[] = [];

  for (const feriado of feriadosLocais) {
    const inicio = new Date(Math.max(feriado.dataInicio.getTime(), Date.UTC(ano, 0, 1)));
    const fim = new Date(Math.min(feriado.dataFim.getTime(), Date.UTC(ano, 11, 31)));
    for (let data = inicio; data <= fim; data = new Date(data.getTime() + 86_400_000)) {
      locais.push({ data: isoData(data), nome: feriado.titulo, abrangencia: "LOCAL" });
    }
  }

  const todos = [...calculados.feriados, ...locais]
    .filter((feriado, indice, lista) =>
      lista.findIndex((item) => item.data === feriado.data && item.nome === feriado.nome) === indice)
    .sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome));

  return NextResponse.json({
    feriados: todos,
    localizacao: { cidade: empresa?.cidade ?? null, estado: empresa?.estado ?? null },
    municipioCoberto: calculados.municipioCoberto,
    fonte: calculados.fonte,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { PERIODOS_ESCOLARES } from "@/lib/periodosAvaliacao";
export const dynamic = "force-dynamic";

async function alunoAutorizado(alunoId: string) {
  const scope = await getSessionScope();
  if (!scope || (!scope.isAdmin && !scope.professoraId)) return null;
  const aluno = await prisma.aluno.findFirst({ where: { id: alunoId, empresaId: scope.empresaId, ...(!scope.isAdmin ? { professoraId: scope.professoraId } : {}) }, select: { materias: { select: { materiaId: true } }, unidade: { select: { escola: { select: { periodoAvaliacao: true } } } } } });
  return aluno ? { aluno, scope } : null;
}

export async function GET(req: NextRequest) {
  const alunoId = req.nextUrl.searchParams.get("alunoId") ?? "";
  const ano = Number(req.nextUrl.searchParams.get("ano"));
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return NextResponse.json({ erro: "Ano inválido." }, { status: 400 });
  const acesso = await alunoAutorizado(alunoId);
  if (!acesso) return NextResponse.json({ erro: "Sem acesso ao aluno." }, { status: 403 });
  const tipoPeriodo = acesso.aluno.unidade.escola.periodoAvaliacao;
  return NextResponse.json(tipoPeriodo ? await prisma.notaPeriodo.findMany({ where: { empresaId: acesso.scope.empresaId, alunoId, ano, tipoPeriodo } }) : []);
}

export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 }); }
  if (typeof body?.alunoId !== "string" || !Number.isInteger(body.ano) || body.ano < 2000 || body.ano > 2100 || !Array.isArray(body.notas) || body.notas.length > 500) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  const acesso = await alunoAutorizado(body.alunoId);
  if (!acesso) return NextResponse.json({ erro: "Sem acesso ao aluno." }, { status: 403 });
  const tipoPeriodo = acesso.aluno.unidade.escola.periodoAvaliacao;
  const periodos = tipoPeriodo ? PERIODOS_ESCOLARES[tipoPeriodo] : undefined;
  if (!periodos || body.tipoPeriodo !== tipoPeriodo) return NextResponse.json({ erro: "Confira o período da escola e recarregue a planilha." }, { status: 400 });
  const materias = new Set(acesso.aluno.materias.map((m) => m.materiaId));
  const chaves = new Set<string>();
  const dados: { materiaId: string; periodo: number; valor: number }[] = [];
  for (const nota of body.notas) {
    if (!nota || !materias.has(nota.materiaId) || !Number.isInteger(nota.periodo) || nota.periodo < 0 || nota.periodo > periodos.length || typeof nota.valor !== "number" || !Number.isFinite(nota.valor) || nota.valor < 0 || nota.valor > 10) return NextResponse.json({ erro: "Use disciplinas do aluno e notas entre 0 e 10." }, { status: 400 });
    const chave = `${nota.materiaId}:${nota.periodo}`;
    if (chaves.has(chave)) return NextResponse.json({ erro: "Nota duplicada." }, { status: 400 });
    chaves.add(chave); dados.push({ materiaId: nota.materiaId, periodo: nota.periodo, valor: nota.valor });
  }
  await prisma.$transaction(async (tx) => {
    await tx.notaPeriodo.deleteMany({ where: { empresaId: acesso.scope.empresaId, alunoId: body.alunoId, ano: body.ano, tipoPeriodo: tipoPeriodo!, materiaId: { in: [...materias] } } });
    if (dados.length) await tx.notaPeriodo.createMany({ data: dados.map((nota) => ({ ...nota, empresaId: acesso.scope.empresaId, alunoId: body.alunoId, ano: body.ano, tipoPeriodo: tipoPeriodo! })) });
  });
  return NextResponse.json({ sucesso: true });
}

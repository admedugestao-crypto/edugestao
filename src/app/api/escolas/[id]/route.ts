import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { parseDataLocal, validarPeriodoLetivo } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existente = await prisma.escola.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Escola não encontrada." }, { status: 404 });
  }

  const datas = {
    periodoLetivo1Inicio: body.periodoLetivo1Inicio ? parseDataLocal(body.periodoLetivo1Inicio) : null,
    periodoLetivo1Fim: body.periodoLetivo1Fim ? parseDataLocal(body.periodoLetivo1Fim) : null,
    periodoLetivo2Inicio: body.periodoLetivo2Inicio ? parseDataLocal(body.periodoLetivo2Inicio) : null,
    periodoLetivo2Fim: body.periodoLetivo2Fim ? parseDataLocal(body.periodoLetivo2Fim) : null,
  };
  const erroPeriodo = validarPeriodoLetivo(datas);
  if (erroPeriodo) return NextResponse.json({ erro: erroPeriodo }, { status: 400 });

  if (body.metodoId) {
    const metodo = await prisma.metodoEnsino.findUnique({ where: { id: body.metodoId }, select: { empresaId: true } });
    if (!metodo || metodo.empresaId !== scope.empresaId) {
      return NextResponse.json({ erro: "Método inválido." }, { status: 400 });
    }
  }

  const unidades = body.unidades;
  if (unidades !== undefined) {
    if (!Array.isArray(unidades) || unidades.some((u: { id?: unknown; nome?: unknown }) => !u || typeof u.id !== "string" || typeof u.nome !== "string" || !u.nome.trim())) return NextResponse.json({ erro: "Informe o nome de cada unidade." }, { status: 400 });
    const ids = unidades.map((u: { id: string }) => u.id);
    const count = await prisma.unidade.count({ where: { id: { in: ids }, escolaId: id, empresaId: scope.empresaId } });
    if (count !== ids.length) return NextResponse.json({ erro: "Unidade inválida para esta escola." }, { status: 400 });
    if (unidades.some((u: Record<string, unknown>) => ["cidade", "estado", "turno"].some(k => u[k] != null && typeof u[k] !== "string"))) return NextResponse.json({ erro: "Dados da unidade inválidos." }, { status: 400 });
  }
  const escola = await prisma.escola.update({
    where: { id },
    data: {
      nome: body.nome,
      rede: body.rede || null,
      metodoId: body.metodoId || null,
      periodoAvaliacao: body.periodoAvaliacao || null,
      ...datas,
      ...(unidades !== undefined && { unidades: { update: unidades.map((u: { id: string; nome: string; cidade?: string; estado?: string; turno?: string }) => ({ where: { id: u.id }, data: { nome: u.nome.trim(), cidade: u.cidade || null, estado: u.estado || null, turno: u.turno || null } })) } }),
    },
    include: { unidades: { orderBy: { nome: "asc" } }, metodoEnsino: true },
  });
  return NextResponse.json(escola);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existente = await prisma.escola.findUnique({ where: { id }, select: { empresaId: true } });
  if (!existente || existente.empresaId !== scope.empresaId) {
    return NextResponse.json({ erro: "Escola não encontrada." }, { status: 404 });
  }

  const [unidades, alunos, avaliacoes] = await Promise.all([
    prisma.unidade.count({ where: { escolaId: id } }),
    prisma.aluno.count({ where: { unidade: { escolaId: id } } }),
    prisma.avaliacao.count({ where: { unidade: { escolaId: id } } }),
  ]);

  if (alunos > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a escola possui alunos vinculados." },
      { status: 409 }
    );
  }
  if (avaliacoes > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a escola possui avaliações vinculadas." },
      { status: 409 }
    );
  }
  if (unidades > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: a escola possui unidades cadastradas." },
      { status: 409 }
    );
  }

  await prisma.escola.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const alunos = await prisma.aluno.findMany({
    where: scopeWhere(scope),
    include: {
      unidade:   { include: { escola: true } },
      materias:  { include: { materia: true } },
      professora: { include: { usuario: true } },
    },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(alunos);
}

export async function POST(req: NextRequest) {
  const scope = await getSessionScope();
  if (!scope) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const form = await req.formData();

  // Admin pode escolher qualquer professora via form (ou deixar sem professor)
  // Professora usa sempre a própria
  const professoraId: string | null = scope.isAdmin
    ? (form.get("professoraId") as string | null) || null
    : scope.professoraId;

  if (!scope.isAdmin && !professoraId)
    return NextResponse.json({ erro: "Sem perfil de professora vinculado." }, { status: 403 });

  const unidadeId = form.get("unidadeId") as string;
  const [unidadeOk, professoraOk] = await Promise.all([
    prisma.unidade.findFirst({ where: { id: unidadeId, empresaId: scope.empresaId }, select: { id: true } }),
    professoraId
      ? prisma.professora.findFirst({ where: { id: professoraId, empresaId: scope.empresaId }, select: { id: true } })
      : Promise.resolve(true),
  ]);
  if (!unidadeOk || !professoraOk) {
    return NextResponse.json({ erro: "Unidade ou professora não encontrada." }, { status: 404 });
  }

  let fotoUrl: string | null = null;
  const foto = form.get("foto") as File | null;
  if (foto && foto.size > 0) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "alunos");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${foto.name.replace(/\s+/g, "_")}`;
    const buffer = Buffer.from(await foto.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);
    fotoUrl = `/uploads/alunos/${filename}`;
  }

  const materias: string[] = JSON.parse((form.get("materias") as string) || "[]");
  const dataNasc = form.get("dataNascimento") as string;

  try {
    const aluno = await prisma.aluno.create({
      data: {
        empresaId: scope.empresaId,
        ...(professoraId ? { professoraId } : {}),
        unidadeId,
        nome: form.get("nome") as string,
        dataNascimento: dataNasc ? new Date(dataNasc) : null,
        fotoUrl,
        serie: form.get("serie") as string,
        turma: (form.get("turma") as string) || null,
        responsavel: (form.get("responsavel") as string) || null,
        telefoneResponsavel: (form.get("telefoneResponsavel") as string) || null,
        emailResponsavel: (form.get("emailResponsavel") as string) || null,
        rua: (form.get("rua") as string) || null,
        numero: (form.get("numero") as string) || null,
        complemento: (form.get("complemento") as string) || null,
        bairro: (form.get("bairro") as string) || null,
        cidade: (form.get("cidade") as string) || null,
        estado: (form.get("estado") as string) || null,
        cep: (form.get("cep") as string) || null,
        observacoes: (form.get("observacoes") as string) || null,
        status: (form.get("status") as any) || "ATIVO",
        tipoCobranca:  (form.get("tipoCobranca") as string) || null,
        valorCobranca: form.get("valorCobranca")  ? parseFloat((form.get("valorCobranca")  as string).replace(",", ".")) : null,
        diaPagamento:  form.get("diaPagamento")  ? parseInt(form.get("diaPagamento")  as string) : null,
        diaPagamento2: form.get("diaPagamento2") ? parseInt(form.get("diaPagamento2") as string) : null,
        diaSemanaCobranca:  form.get("diaSemanaCobranca") !== null && form.get("diaSemanaCobranca") !== "" ? parseInt(form.get("diaSemanaCobranca") as string) : null,
        agendaSemanal: (() => { try { return JSON.parse(form.get("agendaSemanal") as string ?? "[]"); } catch { return []; } })(),
        dataInicioContrato: form.get("dataInicioContrato") ? new Date(form.get("dataInicioContrato") as string) : null,
        dataFimContrato:    form.get("dataFimContrato")    ? new Date(form.get("dataFimContrato")    as string) : null,
        materias: { create: materias.map((mid) => ({ materiaId: mid })) },
      },
    });
    return NextResponse.json(aluno, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/alunos]", err);
    return NextResponse.json({ erro: err?.message ?? "Erro interno ao salvar aluno." }, { status: 500 });
  }
}

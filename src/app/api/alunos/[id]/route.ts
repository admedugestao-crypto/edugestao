import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      unidade: { include: { escola: true } },
      materias: { include: { materia: true } },
      professora: { include: { usuario: { select: { nome: true } } } },
    },
  });

  if (!aluno) return NextResponse.json({ erro: "Não encontrado" }, { status: 404 });

  return NextResponse.json(aluno);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const perfil = (session.user as any).perfil as string;
  const { id } = await params;
  const form = await req.formData();

  // Foto (opcional — só atualiza se enviar novo arquivo)
  let fotoUrl: string | undefined = undefined;
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
  const novoStatus = (form.get("status") as string) || "ATIVO";

  // ── Bloqueia PAUSADO/ENCERRADO se houver agenda futura ou pagamento em aberto ──
  if (novoStatus === "PAUSADO" || novoStatus === "ENCERRADO") {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    const [aulasAbertas, pagamentosAbertos] = await Promise.all([
      prisma.agendaAula.count({
        where: { alunoId: id, status: "AGENDADA", data: { gte: hoje } },
      }),
      prisma.pagamento.count({
        where: { alunoId: id, pago: false },
      }),
    ]);

    if (aulasAbertas > 0 || pagamentosAbertos > 0) {
      const motivos: string[] = [];
      if (aulasAbertas    > 0) motivos.push(`${aulasAbertas} aula(s) agendada(s)`);
      if (pagamentosAbertos > 0) motivos.push(`${pagamentosAbertos} pagamento(s) em aberto`);
      return NextResponse.json(
        { erro: `Não é possível alterar o status: o aluno possui ${motivos.join(" e ")}.` },
        { status: 422 },
      );
    }
  }

  try {
    // Remove materias antigas e recria
    await prisma.alunoMateria.deleteMany({ where: { alunoId: id } });


    // Admin pode reatribuir professor; outros não alteram
    const professoraIdNovo = perfil === "SUPERADMIN" && form.get("professoraId")
      ? (form.get("professoraId") as string)
      : undefined;

    const aluno = await prisma.aluno.update({
      where: { id },
      data: {
        ...(professoraIdNovo && { professoraId: professoraIdNovo }),
        unidadeId: form.get("unidadeId") as string,
        nome: form.get("nome") as string,
        dataNascimento: dataNasc ? new Date(dataNasc) : null,
        ...(fotoUrl !== undefined && { fotoUrl }),
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
        tipoCobranca: (form.get("tipoCobranca") as string) || null,
        valorCobranca: form.get("valorCobranca") ? parseFloat((form.get("valorCobranca") as string).replace(",", ".")) : null,
        diaPagamento: form.get("diaPagamento") ? parseInt(form.get("diaPagamento") as string) : null,
        diaPagamento2: form.get("diaPagamento2") ? parseInt(form.get("diaPagamento2") as string) : null,
        diaSemana: form.get("diaSemana") !== null && form.get("diaSemana") !== "" ? parseInt(form.get("diaSemana") as string) : null,
        horaAula: (form.get("horaAula") as string) || null,
        dataInicioContrato: form.get("dataInicioContrato") ? new Date(form.get("dataInicioContrato") as string) : null,
        dataFimContrato:    form.get("dataFimContrato")    ? new Date(form.get("dataFimContrato")    as string) : null,
        materias: { create: materias.map((mid) => ({ materiaId: mid })) },
      },
    });

    return NextResponse.json(aluno);
  } catch (err: any) {
    console.error("[PUT /api/alunos/:id]", err);
    return NextResponse.json({ erro: err?.message ?? "Erro interno ao salvar aluno." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  // ── Bloqueia exclusão de aluno ativo ou com pendências ───────────────────
  const aluno = await prisma.aluno.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!aluno) return NextResponse.json({ erro: "Aluno não encontrado." }, { status: 404 });

  if (aluno.status === "ATIVO") {
    return NextResponse.json(
      { erro: "Não é possível excluir um aluno com status Ativo. Pause ou encerre-o antes de excluir." },
      { status: 422 },
    );
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const [aulasAbertas, pagamentosAbertos] = await Promise.all([
    prisma.agendaAula.count({
      where: { alunoId: id, status: "AGENDADA", data: { gte: hoje } },
    }),
    prisma.pagamento.count({
      where: { alunoId: id, pago: false },
    }),
  ]);

  if (aulasAbertas > 0 || pagamentosAbertos > 0) {
    const motivos: string[] = [];
    if (aulasAbertas     > 0) motivos.push(`${aulasAbertas} aula(s) agendada(s)`);
    if (pagamentosAbertos > 0) motivos.push(`${pagamentosAbertos} pagamento(s) em aberto`);
    return NextResponse.json(
      { erro: `Não é possível excluir: o aluno possui ${motivos.join(" e ")}.` },
      { status: 422 },
    );
  }

  try {
    await prisma.aluno.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[DELETE /api/alunos/:id]", err);
    return NextResponse.json({ erro: err?.message ?? "Erro ao excluir aluno." }, { status: 500 });
  }
}

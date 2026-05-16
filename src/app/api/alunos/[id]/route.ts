import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      unidade: { include: { escola: true } },
      materias: { include: { materia: true } },
      notas: { include: { avaliacao: true, materia: true }, orderBy: { criadoEm: "desc" } },
    },
  });

  if (!aluno) return NextResponse.json({ erro: "Não encontrado" }, { status: 404 });
  return NextResponse.json(aluno);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const form = await req.formData();

  let fotoUrl: string | undefined = undefined;
  const foto = form.get("foto") as File | null;
  if (foto && foto.size > 0) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "alunos");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${foto.name.replace(/\s+/g, "_")}`;
    await writeFile(path.join(uploadDir, filename), Buffer.from(await foto.arrayBuffer()));
    fotoUrl = `/uploads/alunos/${filename}`;
  }

  const materias: string[] = JSON.parse((form.get("materias") as string) || "[]");
  const dataNasc = form.get("dataNascimento") as string;

  try {
    await prisma.alunoMateria.deleteMany({ where: { alunoId: id } });

    const aluno = await prisma.aluno.update({
      where: { id },
      data: {
        unidade: { connect: { id: form.get("unidadeId") as string } },
        nome: form.get("nome") as string,
        dataNascimento: dataNasc ? new Date(dataNasc) : null,
        ...(fotoUrl ? { fotoUrl } : {}),
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
        diaSemana:     form.get("diaSemana") !== null && form.get("diaSemana") !== "" ? parseInt(form.get("diaSemana") as string) : null,
        horaAula:     (form.get("horaAula") as string) || null,
        materias: { create: materias.map((mid) => ({ materiaId: mid })) },
      },
    });

    return NextResponse.json(aluno);
  } catch (err: any) {
    console.error("[PUT /api/alunos/:id]", err);
    return NextResponse.json({ erro: err?.message ?? "Erro interno ao salvar aluno." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const [notas, conteudos] = await Promise.all([
    prisma.nota.count({ where: { alunoId: id } }),
    prisma.conteudo.count({ where: { alunoId: id } }),
  ]);

  if (notas > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: o aluno possui notas registradas." },
      { status: 409 }
    );
  }
  if (conteudos > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: o aluno possui conteúdos registrados." },
      { status: 409 }
    );
  }

  await prisma.aluno.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

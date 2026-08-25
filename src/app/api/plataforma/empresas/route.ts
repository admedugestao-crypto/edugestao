import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

// Lista todas as empresas — só o papel PLATAFORMA enxerga isso.
export async function GET() {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const empresas = await prisma.empresa.findMany({
    orderBy: { criadoEm: "desc" },
    select: {
      id: true, nome: true, slug: true, logoUrl: true, ativo: true, criadoEm: true,
      cep: true, logradouro: true, numero: true, complemento: true,
      bairro: true, cidade: true, estado: true, codigoIbge: true,
      fonnteToken: true, evolutionApiUrl: true, evolutionApiKey: true, evolutionApiInstance: true,
      emailHost: true, emailPort: true, emailUser: true, emailPass: true, emailFrom: true,
      _count: { select: { usuarios: true } },
    },
  });
  return NextResponse.json(empresas);
}

// Cria uma empresa nova + seu primeiro usuário SUPERADMIN.
export async function POST(req: NextRequest) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const {
    empresaNome, nome, email, senha, logoUrl,
    cep, logradouro, numero, complemento, bairro, cidade, estado, codigoIbge,
  } = body;

  if (!empresaNome || !nome || !email || !senha) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const existente = await prisma.usuario.findFirst({ where: { email } });
  if (existente) {
    return NextResponse.json({ erro: "Este e-mail já está cadastrado." }, { status: 409 });
  }

  const base = slugify(empresaNome) || "empresa";
  let slug = base;
  for (let i = 0; await prisma.empresa.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (i > 10) break;
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: {
        nome: empresaNome,
        slug,
        logoUrl: typeof logoUrl === "string" ? logoUrl : null,
        cep: typeof cep === "string" ? cep.trim() || null : null,
        logradouro: typeof logradouro === "string" ? logradouro.trim() || null : null,
        numero: typeof numero === "string" ? numero.trim() || null : null,
        complemento: typeof complemento === "string" ? complemento.trim() || null : null,
        bairro: typeof bairro === "string" ? bairro.trim() || null : null,
        cidade: typeof cidade === "string" ? cidade.trim() || null : null,
        estado: typeof estado === "string" ? estado.trim().toUpperCase() || null : null,
        codigoIbge: typeof codigoIbge === "string" ? codigoIbge.trim() || null : null,
      },
    });
    return tx.usuario.create({
      data: { nome, email, senhaHash, perfil: "SUPERADMIN", empresaId: empresa.id, senhaTemporaria: true },
    });
  });

  return NextResponse.json({ id: usuario.id, empresaSlug: slug }, { status: 201 });
}

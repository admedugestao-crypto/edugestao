import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

const PERFIS = ["PLATAFORMA", "SUPERADMIN", "PROFESSORA", "AUXILIAR"] as const;
type PerfilValido = (typeof PERFIS)[number];

// Lista todos os usuários do sistema — de qualquer empresa e de qualquer
// perfil. Cadastro de usuário é centralizado aqui, na plataforma; as
// empresas não gerenciam mais os próprios usuários.
export async function GET() {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }
  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true, nome: true, email: true, ativo: true, criadoEm: true, perfil: true,
      foto: true, whatsapp: true,
      empresa: { select: { id: true, nome: true, slug: true } },
      professora: { select: { disponibilidade: true } },
    },
    orderBy: [{ empresa: { nome: "asc" } }, { perfil: "asc" }, { nome: "asc" }],
  });
  return NextResponse.json(
    usuarios.map(({ professora, ...u }) => ({ ...u, disponibilidade: professora?.disponibilidade ?? [] }))
  );
}

// Cria um novo usuário de qualquer perfil. PLATAFORMA nunca tem empresa;
// os demais perfis (SUPERADMIN, PROFESSORA, AUXILIAR) exigem uma empresa —
// o vínculo usuário x empresa é decidido aqui, nesta tela.
export async function POST(req: NextRequest) {
  if (!(await requirePlataforma())) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, email, senha, empresaId, foto, whatsapp, disponibilidade } = body;
  const perfil: PerfilValido = PERFIS.includes(body.perfil) ? body.perfil : "PROFESSORA";

  if (!nome || !email || !senha) {
    return NextResponse.json({ erro: "Preencha todos os campos." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const vinculoEmpresaId: string | null = perfil === "PLATAFORMA"
    ? null
    : (typeof empresaId === "string" && empresaId ? empresaId : null);

  if (perfil !== "PLATAFORMA" && !vinculoEmpresaId) {
    return NextResponse.json({ erro: "Escolha a empresa para esse perfil." }, { status: 400 });
  }

  if (vinculoEmpresaId) {
    const empresa = await prisma.empresa.findUnique({ where: { id: vinculoEmpresaId } });
    if (!empresa) {
      return NextResponse.json({ erro: "Empresa não encontrada." }, { status: 404 });
    }
  } else {
    // empresaId é sempre null para PLATAFORMA — a unicidade de e-mail não é
    // garantida pelo banco nesse caso (NULL não colide consigo mesmo), então
    // a checagem é feita aqui.
    const existente = await prisma.usuario.findFirst({ where: { email, perfil: "PLATAFORMA" } });
    if (existente) {
      return NextResponse.json({ erro: "Este e-mail já está cadastrado." }, { status: 409 });
    }
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  try {
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        perfil,
        empresaId: vinculoEmpresaId,
        ativo: true,
        senhaTemporaria: perfil !== "PLATAFORMA",
        foto: foto || null,
        whatsapp: whatsapp || null,
        ...(perfil === "PROFESSORA"
          ? { professora: { create: { empresaId: vinculoEmpresaId!, disponibilidade: disponibilidade ?? [] } } }
          : {}),
      },
      select: { id: true, nome: true, email: true, ativo: true, criadoEm: true },
    });
    return NextResponse.json(usuario, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ erro: "Este e-mail já está cadastrado nessa empresa." }, { status: 409 });
    }
    throw err;
  }
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import ImprimirAlunoClient from "./ImprimirAlunoClient";

export const dynamic = "force-dynamic";

export default async function ImprimirAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const { id } = await params;

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      unidade: { include: { escola: true } },
      materias: { include: { materia: true } },
      professora: { include: { usuario: { select: { nome: true } } } },
    },
  });

  if (!aluno || aluno.empresaId !== scope.empresaId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">Aluno não encontrado.</p>
      </div>
    );
  }

  return (
    <ImprimirAlunoClient
      aluno={{
        ...aluno,
        dataNascimento: aluno.dataNascimento ? aluno.dataNascimento.toISOString() : null,
        valorCobranca: aluno.valorCobranca != null ? Number(aluno.valorCobranca) : null,
      }}
    />
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { Calendar } from "lucide-react";
import CalendarioClient from "@/components/CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const professoraId = scope.professoraId;

  const [avaliacoes, escolas, materias] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { empresaId: scope.empresaId },
      include: { unidade: { include: { escola: true } }, materia: true },
      orderBy: { data: "asc" },
    }),
    prisma.escola.findMany({
      where: { empresaId: scope.empresaId },
      include: { unidades: { orderBy: { nome: "asc" } } },
      orderBy: { nome: "asc" },
    }),
    // Se for professor, traz só as disciplinas vinculadas aos seus alunos
    // Se for admin, traz todas
    professoraId
      ? prisma.materia.findMany({
          where: {
            empresaId: scope.empresaId,
            alunoMaterias: {
              some: { aluno: { professoraId } },
            },
          },
          orderBy: { nome: "asc" },
        })
      : prisma.materia.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
  ]);

  const avaliacoesSerial = avaliacoes.map((a) => ({
    ...a,
    data: a.data.toISOString(),
    criadoEm: a.criadoEm.toISOString(),
    unidade: {
      ...a.unidade,
      criadoEm: a.unidade.criadoEm.toISOString(),
      escola: { ...a.unidade.escola, criadoEm: a.unidade.escola.criadoEm.toISOString() },
    },
  }));

  const escolasSerial = escolas.map((e) => ({
    ...e,
    criadoEm: e.criadoEm.toISOString(),
    unidades: e.unidades.map((u) => ({ ...u, criadoEm: u.criadoEm.toISOString() })),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Calendar size={20} className="text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">Calendário de Provas</h1>
      </div>
      <CalendarioClient avaliacoes={avaliacoesSerial as any} escolas={escolasSerial as any} materias={materias} />
    </div>
  );
}

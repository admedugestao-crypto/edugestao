import { prisma } from "@/lib/prisma";
export function lerMateriasAluno(valor: FormDataEntryValue | null): string[] | null {
  try { const ids = JSON.parse(typeof valor === "string" ? valor : "[]");
    return Array.isArray(ids) && ids.every(id => typeof id === "string" && id.length > 0) ? [...new Set<string>(ids)] : null;
  } catch { return null; }
}
export async function referenciasAlunoValidas(empresaId: string, unidadeId: string, professoraId: string | null, materias: string[]) {
  if (!unidadeId) return false;
  const [unidade, professora, disciplinas] = await Promise.all([
    prisma.unidade.findFirst({ where: { id: unidadeId, empresaId }, select: { id: true } }),
    professoraId ? prisma.professora.findFirst({ where: { id: professoraId, empresaId }, select: { id: true } }) : Promise.resolve(true),
    prisma.materia.count({ where: { id: { in: materias }, empresaId } }),
  ]);
  return !!unidade && !!professora && disciplinas === materias.length;
}

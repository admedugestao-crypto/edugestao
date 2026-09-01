import AlunoForm from "@/components/AlunoForm";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import styles from "../../v2.module.css";

export const dynamic = "force-dynamic";

export default async function NovoAlunoV2Page() {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");
  const [escolas, materias, professoras, professora] = await Promise.all([
    prisma.escola.findMany({ where: { empresaId: scope.empresaId }, include: { unidades: { orderBy: { nome: "asc" } } }, orderBy: { nome: "asc" } }),
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
    scope.isAdmin ? prisma.professora.findMany({ where: { empresaId: scope.empresaId }, select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } }, orderBy: { usuario: { nome: "asc" } } }) : Promise.resolve([]),
    scope.isAdmin ? Promise.resolve(null) : prisma.professora.findUnique({ where: { usuarioId: scope.userId }, select: { disponibilidade: true } }),
  ]);
  return <div className={styles.studentFormPage}>
    <header className={styles.studentFormHeader}><div><p><UserPlus size={15}/> Novo vínculo</p><h1>Cadastrar <em>aluno.</em></h1><span>Preencha uma etapa de cada vez.</span></div></header>
    <section className={styles.studentFormSurface}><AlunoForm variant="v2" escolas={escolas} materias={materias} professoras={professoras.map((item) => ({ ...item, disponibilidade: (item.disponibilidade as { dia: string; inicio: string; fim: string }[]) ?? [] }))} perfil={scope.perfil} isAdmin={scope.isAdmin} dispProfessora={scope.isAdmin ? null : ((professora?.disponibilidade as { dia: string; inicio: string; fim: string }[]) ?? [])}/></section>
  </div>;
}

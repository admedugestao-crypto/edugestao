import AlunoForm from "@/components/AlunoForm";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { Pencil } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import styles from "../../../v2.module.css";

export const dynamic = "force-dynamic";

export default async function EditarAlunoV2Page({ params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope(); if (!scope) redirect("/login");
  const { id } = await params;
  const [aluno, escolas, materias, professoras, professora] = await Promise.all([
    prisma.aluno.findUnique({ where: { id }, include: { materias: true, unidade: { include: { escola: true } } } }),
    prisma.escola.findMany({ where: { empresaId: scope.empresaId }, include: { unidades: { orderBy: { nome: "asc" } } }, orderBy: { nome: "asc" } }),
    prisma.materia.findMany({ where: { empresaId: scope.empresaId }, orderBy: { nome: "asc" } }),
    scope.isAdmin ? prisma.professora.findMany({ where: { empresaId: scope.empresaId }, select: { id: true, disponibilidade: true, usuario: { select: { nome: true } } }, orderBy: { usuario: { nome: "asc" } } }) : Promise.resolve([]),
    scope.isAdmin ? Promise.resolve(null) : prisma.professora.findUnique({ where: { usuarioId: scope.userId }, select: { disponibilidade: true } }),
  ]);
  if (!aluno || aluno.empresaId !== scope.empresaId) notFound();
  const inicial = { ...aluno, valorCobranca: aluno.valorCobranca == null ? null : Number(aluno.valorCobranca), unidade: { ...aluno.unidade, escolaId: aluno.unidade.escolaId ?? aluno.unidadeId }, materias: aluno.materias.map((item) => ({ materiaId: item.materiaId })) };
  return <div className={styles.studentFormPage}>
    <header className={styles.studentFormHeader}><div><p><Pencil size={15}/> Atualizar cadastro</p><h1>Editar <em>aluno.</em></h1><span>{aluno.nome}</span></div></header>
    <section className={styles.studentFormSurface}><AlunoForm variant="v2" escolas={escolas} materias={materias} alunoInicial={inicial} professoras={professoras.map((item) => ({ ...item, disponibilidade: (item.disponibilidade as { dia: string; inicio: string; fim: string }[]) ?? [] }))} perfil={scope.perfil} isAdmin={scope.isAdmin} dispProfessora={scope.isAdmin ? null : ((professora?.disponibilidade as { dia: string; inicio: string; fim: string }[]) ?? [])}/></section>
  </div>;
}

import { podeAcessarProfessora } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { ArrowLeft, BookOpen, CalendarDays, CircleDollarSign, MapPin, Pencil, Printer, School, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import styles from "../../v2.module.css";

export const dynamic = "force-dynamic";

function Data({ label, value }: { label: string; value?: string | null }) {
  return <div><span>{label}</span><strong>{value || "Não informado"}</strong></div>;
}

export default async function AlunoV2Page({ params }: { params: Promise<{ id: string }> }) {
  const scope = await getSessionScope(); if (!scope) redirect("/login");
  const { id } = await params;
  const aluno = await prisma.aluno.findUnique({ where: { id }, include: { unidade: { include: { escola: true } }, materias: { include: { materia: true } }, professora: { include: { usuario: { select: { nome: true } } } } } });
  if (!aluno || aluno.empresaId !== scope.empresaId || !podeAcessarProfessora(scope, aluno.professoraId)) notFound();
  const endereco = [[aluno.rua, aluno.numero].filter(Boolean).join(", "), aluno.bairro, [aluno.cidade, aluno.estado].filter(Boolean).join(" · ")].filter(Boolean).join(" — ");
  const agendaAtual = (Array.isArray(aluno.agendaSemanal) ? aluno.agendaSemanal : []) as { diaSemana: number; horaAula: string }[];
  const agenda = agendaAtual.length ? agendaAtual : aluno.diaSemana != null && aluno.horaAula ? [{ diaSemana: aluno.diaSemana, horaAula: aluno.horaAula }] : [];
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return <div className={styles.studentViewPage}>
    <header className={styles.studentViewHeader}>
      <Link href="/v2/alunos"><ArrowLeft size={16}/> Alunos</Link>
      <div className="flex flex-wrap gap-2"><Link href={`/v2/alunos/${id}/imprimir`} className={styles.primaryAction}><Printer size={16}/> Imprimir ficha</Link><Link href={`/v2/alunos/${id}/editar`} className={styles.primaryAction}><Pencil size={16}/> Editar cadastro</Link></div>
    </header>
    <section className={styles.studentProfile}>
      {aluno.fotoUrl ? <Image src={aluno.fotoUrl} alt="" width={64} height={64} unoptimized/> : <b>{aluno.nome[0]}</b>}
      <div><span>Perfil do aluno</span><h1>{aluno.nome}</h1><p>{aluno.unidade.escola.nome} · {aluno.serie}{aluno.turma ? ` — ${aluno.turma}` : ""}</p></div>
      <mark data-status={aluno.status}>{aluno.status === "ATIVO" ? "Ativo" : aluno.status === "PAUSADO" ? "Pausado" : "Encerrado"}</mark>
    </section>
    <div className={styles.studentDetailsGrid}>
      <article><h2><User size={16}/> Contato e responsável</h2><div className={styles.studentData}><Data label="Responsável" value={aluno.responsavel}/><Data label="Telefone" value={aluno.telefoneResponsavel}/><Data label="E-mail" value={aluno.emailResponsavel}/><Data label="Nascimento" value={aluno.dataNascimento?.toLocaleDateString("pt-BR")}/></div></article>
      <article><h2><School size={16}/> Vida escolar</h2><div className={styles.studentData}><Data label="Escola" value={aluno.unidade.escola.nome}/><Data label="Unidade" value={aluno.unidade.nome}/><Data label="Série / turma" value={`${aluno.serie}${aluno.turma ? ` — ${aluno.turma}` : ""}`}/><Data label="Professor(a)" value={aluno.professora?.usuario.nome}/></div></article>
      <article><h2><MapPin size={16}/> Endereço</h2><p className={styles.studentParagraph}>{endereco || "Nenhum endereço cadastrado."}</p></article>
      <article><h2><BookOpen size={16}/> Disciplinas</h2><div className={styles.subjectTags}>{aluno.materias.map(({ materia }) => <span key={materia.id} style={{ borderColor: materia.cor, color: materia.cor }}>{materia.nome}</span>)}</div></article>
      <article><h2><CalendarDays size={16}/> Agenda fixa</h2><div className={styles.subjectTags}>{agenda.length ? agenda.map((item, index) => <span key={index}>{dias[item.diaSemana]} · {item.horaAula}</span>) : <p className={styles.studentParagraph}>Nenhum horário fixo.</p>}</div></article>
      <article><h2><CircleDollarSign size={16}/> Contrato e cobrança</h2><div className={styles.studentData}><Data label="Modelo" value={aluno.tipoCobranca?.replace("_", " ")}/><Data label="Valor" value={aluno.valorCobranca == null ? null : Number(aluno.valorCobranca).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/>{(aluno.tipoCobranca === "MENSAL" || aluno.tipoCobranca === "QUINZENAL") && <Data label="Dia do vencimento" value={aluno.diaPagamento?.toString()}/>}
        {aluno.tipoCobranca === "QUINZENAL" && <Data label="2º vencimento (dia)" value={aluno.diaPagamento2?.toString()}/>}
        {aluno.tipoCobranca === "SEMANAL" && <Data label="Dia de vencimento semanal" value={aluno.diaSemanaCobranca == null ? null : dias[aluno.diaSemanaCobranca]}/>}
        <Data label="Início" value={aluno.dataInicioContrato?.toLocaleDateString("pt-BR")}/><Data label="Término" value={aluno.dataFimContrato?.toLocaleDateString("pt-BR")}/></div></article>
      {aluno.observacoes && <article><h2>Observações</h2><p className="whitespace-pre-wrap">{aluno.observacoes}</p></article>}
    </div>
  </div>;
}

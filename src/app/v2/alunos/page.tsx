import AlunosTabela from "@/components/AlunosTabela";
import { prisma } from "@/lib/prisma";
import { getSessionScope, scopeWhere } from "@/lib/tenant";
import { Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "../v2.module.css";

export const dynamic = "force-dynamic";

const CAMPOS = [
  { value: "nome", label: "Nome" },
  { value: "serie", label: "Série" },
  { value: "turma", label: "Turma" },
  { value: "escola", label: "Escola" },
  { value: "responsavel", label: "Responsável" },
  { value: "disciplina", label: "Disciplina" },
] as const;

type Campo = (typeof CAMPOS)[number]["value"];

function filtroWhere(campo: Campo, busca: string) {
  if (!busca) return {};
  if (campo === "nome") return { nome: { contains: busca } };
  if (campo === "serie") return { serie: { contains: busca } };
  if (campo === "turma") return { turma: { contains: busca } };
  if (campo === "escola") return { unidade: { escola: { nome: { contains: busca } } } };
  if (campo === "responsavel") return { responsavel: { contains: busca } };
  return { materias: { some: { materia: { nome: { contains: busca } } } } };
}

export default async function V2AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; campo?: string }>;
}) {
  const scope = await getSessionScope();
  if (!scope) redirect("/login");

  const params = await searchParams;
  const q = params.q ?? "";
  const status = ["ATIVO", "PAUSADO", "ENCERRADO"].includes(params.status ?? "") ? params.status! : "ATIVO";
  const campo = CAMPOS.some((item) => item.value === params.campo) ? params.campo as Campo : "nome";
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const resultado = await prisma.aluno.findMany({
    where: { ...scopeWhere(scope), status: status as "ATIVO" | "PAUSADO" | "ENCERRADO", ...filtroWhere(campo, q) },
    include: {
      unidade: { include: { escola: true } },
      materias: { include: { materia: true } },
      pagamentos: { where: { mes, ano } },
      professora: { include: { usuario: { select: { nome: true } } } },
    },
    orderBy: { nome: "asc" },
  });

  const alunos = resultado.map((aluno) => ({
    ...aluno,
    valorCobranca: aluno.valorCobranca == null ? null : Number(aluno.valorCobranca),
  }));

  return (
    <div className={styles.studentsPage}>
      <header className={styles.studentsHeader}>
        <div>
          <p><Users aria-hidden="true" size={15} /> Acompanhamento pedagógico</p>
          <h1>Alunos em <em>perspectiva.</em></h1>
          <span>{alunos.length} {alunos.length === 1 ? "aluno encontrado" : "alunos encontrados"}</span>
        </div>
        <Link href="/dashboard/alunos/novo" className={styles.primaryAction}>
          <Plus aria-hidden="true" size={17} /> Novo aluno
        </Link>
      </header>

      <section className={styles.studentsSurface} aria-label="Lista de alunos">
        <div className={styles.studentsToolbar}>
          <form method="GET" className={styles.studentsSearch}>
            <select name="campo" defaultValue={campo} aria-label="Campo de busca">
              {CAMPOS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <label>
              <Search aria-hidden="true" size={16} />
              <input name="q" defaultValue={q} placeholder="Buscar aluno…" />
            </label>
            <input type="hidden" name="status" value={status} />
            <button type="submit">Buscar</button>
          </form>
          <div className={styles.studentsTabs} aria-label="Situação do aluno">
            {(["ATIVO", "PAUSADO", "ENCERRADO"] as const).map((item) => (
              <Link key={item} href={`/v2/alunos?status=${item}&q=${encodeURIComponent(q)}&campo=${campo}`} data-active={status === item}>
                {item === "ATIVO" ? "Ativos" : item === "PAUSADO" ? "Pausados" : "Encerrados"}
              </Link>
            ))}
          </div>
        </div>
        <div className={styles.studentsGrid}>
          <AlunosTabela alunos={alunos} isAdmin={scope.isAdmin} mes={mes} ano={ano} />
        </div>
      </section>
    </div>
  );
}

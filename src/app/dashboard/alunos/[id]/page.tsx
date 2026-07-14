import { prisma } from "@/lib/prisma";
import { getSessionScope } from "@/lib/tenant";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User, School, MapPin, BookOpen, Pencil, Phone, Mail,
  CalendarDays, ArrowLeft, ClipboardList, Printer, DollarSign, Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

const DIA_NOME: Record<string, string> = {
  "0": "Domingo", "1": "Segunda-feira", "2": "Terça-feira",
  "3": "Quarta-feira", "4": "Quinta-feira", "5": "Sexta-feira", "6": "Sábado",
};

const TIPO_COBRANCA_LABEL: Record<string, string> = {
  MENSAL: "Mensal",
  QUINZENAL: "Quinzenal (2x por mês)",
  SEMANAL: "Semanal",
  POR_AULA: "Por aula",
};

export default async function VisualizarAlunoPage({
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
      notas: {
        include: { avaliacao: true, materia: true },
        orderBy: { avaliacao: { data: "desc" } },
        take: 5,
      },
    },
  });

  if (!aluno || aluno.empresaId !== scope.empresaId) notFound();

  const statusLabel: Record<string, string> = {
    ATIVO: "Ativo",
    PAUSADO: "Pausado",
    ENCERRADO: "Encerrado",
  };
  const statusCor: Record<string, string> = {
    ATIVO: "bg-emerald-100 text-emerald-700",
    PAUSADO: "bg-amber-100 text-amber-700",
    ENCERRADO: "bg-slate-100 text-slate-600",
  };

  function Campo({ label, valor }: { label: string; valor?: string | null }) {
    if (!valor) return null;
    return (
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm text-slate-800">{valor}</p>
      </div>
    );
  }

  const endereco = [aluno.rua, aluno.numero, aluno.complemento].filter(Boolean).join(", ");
  const enderecoLinha2 = [aluno.bairro, aluno.cidade, aluno.estado].filter(Boolean).join(" · ");

  const agendaSemanal = (Array.isArray(aluno.agendaSemanal) ? aluno.agendaSemanal : []) as {
    diaSemana: number;
    horaAula: string;
  }[];
  const temAgendaLegado = agendaSemanal.length === 0 && aluno.diaSemana != null && !!aluno.horaAula;

  function formatBRL(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/alunos"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/alunos/${id}/imprimir`}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Printer size={14} />
            Imprimir Ficha
          </Link>
          <Link
            href={`/dashboard/alunos/${id}/editar`}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Pencil size={14} />
            Editar
          </Link>
        </div>
      </div>

      {/* Perfil — fixo no topo enquanto o resto da página rola */}
      <div className="sticky top-0 z-10 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {aluno.fotoUrl ? (
            <Image
              src={aluno.fotoUrl}
              alt={aluno.nome}
              width={72}
              height={72}
              className="rounded-full object-cover w-18 h-18 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-2xl shrink-0">
              {aluno.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800">{aluno.nome}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {aluno.unidade.escola.nome} · {aluno.unidade.nome} · {aluno.serie}
              {aluno.turma ? ` - ${aluno.turma}` : ""}
            </p>
            <div className="mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCor[aluno.status]}`}>
                {statusLabel[aluno.status]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Dados pessoais</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo
            label="Data de nascimento"
            valor={
              aluno.dataNascimento
                ? new Date(aluno.dataNascimento).toLocaleDateString("pt-BR")
                : null
            }
          />
          <Campo label="Responsável" valor={aluno.responsavel} />
          <Campo label="Telefone do responsável" valor={aluno.telefoneResponsavel} />
          <Campo label="E-mail do responsável" valor={aluno.emailResponsavel} />
        </div>
        {!aluno.dataNascimento && !aluno.responsavel && !aluno.telefoneResponsavel && !aluno.emailResponsavel && (
          <p className="text-sm text-slate-400">Nenhum dado pessoal cadastrado.</p>
        )}
      </div>

      {/* Endereço */}
      {(endereco || enderecoLinha2 || aluno.cep) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Endereço residencial</h2>
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            {endereco && <p>{endereco}</p>}
            {enderecoLinha2 && <p>{enderecoLinha2}</p>}
            {aluno.cep && <p className="text-slate-500">CEP: {aluno.cep}</p>}
          </div>
        </div>
      )}

      {/* Disciplinas */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Disciplinas atendidas</h2>
        </div>
        {aluno.materias.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma disciplina vinculada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {aluno.materias.map(({ materia }) => (
              <span
                key={materia.id}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: materia.cor }}
              >
                {materia.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Professor(a) responsável */}
      {aluno.professora && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Professor(a) responsável</h2>
          </div>
          <p className="text-sm text-slate-800">{aluno.professora.usuario.nome}</p>
        </div>
      )}

      {/* Agenda semanal */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Agenda semanal</h2>
        </div>
        {agendaSemanal.length > 0 || temAgendaLegado ? (
          <div className="flex flex-wrap gap-2">
            {agendaSemanal.map((e, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                {DIA_NOME[String(e.diaSemana)]} · {e.horaAula}
              </span>
            ))}
            {temAgendaLegado && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                {DIA_NOME[String(aluno.diaSemana)]} · {aluno.horaAula}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Nenhum horário fixo cadastrado.</p>
        )}
      </div>

      {/* Cobrança */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Cobrança</h2>
        </div>
        {aluno.tipoCobranca ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Tipo de cobrança" valor={TIPO_COBRANCA_LABEL[aluno.tipoCobranca] ?? aluno.tipoCobranca} />
            <Campo label="Valor" valor={aluno.valorCobranca != null ? formatBRL(aluno.valorCobranca) : null} />
            {aluno.tipoCobranca === "MENSAL" && (
              <Campo label="Dia do vencimento" valor={aluno.diaPagamento != null ? String(aluno.diaPagamento) : null} />
            )}
            {aluno.tipoCobranca === "QUINZENAL" && (
              <>
                <Campo label="1º vencimento (dia)" valor={aluno.diaPagamento != null ? String(aluno.diaPagamento) : null} />
                <Campo label="2º vencimento (dia)" valor={aluno.diaPagamento2 != null ? String(aluno.diaPagamento2) : null} />
              </>
            )}
            {aluno.tipoCobranca === "SEMANAL" && (
              <Campo
                label="Dia de vencimento semanal"
                valor={aluno.diaSemanaCobranca != null ? DIA_NOME[String(aluno.diaSemanaCobranca)] : null}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Nenhuma configuração de cobrança cadastrada.</p>
        )}
      </div>

      {/* Período contratual */}
      {(aluno.dataInicioContrato || aluno.dataFimContrato) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Período contratual</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              label="Data de início"
              valor={aluno.dataInicioContrato ? new Date(aluno.dataInicioContrato).toLocaleDateString("pt-BR") : null}
            />
            <Campo
              label="Data de término"
              valor={aluno.dataFimContrato ? new Date(aluno.dataFimContrato).toLocaleDateString("pt-BR") : null}
            />
          </div>
        </div>
      )}

      {/* Últimas notas */}
      {aluno.notas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Últimas notas</h2>
          </div>
          <div className="space-y-2">
            {aluno.notas.map((nota) => (
              <div key={nota.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{nota.avaliacao.nome}</p>
                  <p className="text-xs text-slate-500">
                    {nota.materia.nome} · {new Date(nota.avaliacao.data).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-indigo-700">
                  {nota.valor} / {nota.avaliacao.notaMax}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observações */}
      {aluno.observacoes && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-2">Observações</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{aluno.observacoes}</p>
        </div>
      )}
    </div>
  );
}

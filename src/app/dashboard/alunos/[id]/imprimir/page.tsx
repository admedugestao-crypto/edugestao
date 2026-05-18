"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Printer } from "lucide-react";

interface AlunoImpressao {
  id: string;
  nome: string;
  dataNascimento: string | null;
  fotoUrl: string | null;
  serie: string | null;
  turma: string | null;
  status: string;
  responsavel: string | null;
  telefoneResponsavel: string | null;
  emailResponsavel: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  tipoCobranca: string | null;
  valorCobranca: number | null;
  diaPagamento: number | null;
  horaAula: string | null;
  unidade: { nome: string; escola: { nome: string } };
  materias: { materia: { nome: string; cor: string } }[];
  professora?: { usuario: { nome: string } } | null;
}

const statusLabel: Record<string, string> = {
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  ENCERRADO: "Encerrado",
};

const tipoCobrancaLabel: Record<string, string> = {
  MENSAL: "Mensal",
  QUINZENAL: "Quinzenal",
  SEMANAL: "Semanal",
  POR_AULA: "Por aula",
};

function Linha({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-dashed border-slate-200 last:border-0">
      <span className="text-xs font-semibold text-slate-500 w-44 shrink-0">{label}:</span>
      <span className="text-sm text-slate-800 flex-1">{valor || "—"}</span>
    </div>
  );
}

export default function ImprimirAlunoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [aluno, setAluno] = useState<AlunoImpressao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/alunos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAluno(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">Carregando ficha...</p>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">Aluno não encontrado.</p>
      </div>
    );
  }

  const endereco = [aluno.rua, aluno.numero, aluno.complemento].filter(Boolean).join(", ");
  const enderecoCompleto = [endereco, aluno.bairro, aluno.cidade, aluno.estado]
    .filter(Boolean)
    .join(" — ");
  const enderecoFinal = [enderecoCompleto, aluno.cep ? `CEP: ${aluno.cep}` : null]
    .filter(Boolean)
    .join("  ");

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Estilos de impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .ficha-wrapper {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .ficha-container {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
          }
        }
        @page {
          size: A4;
          margin: 1.5cm;
        }
      `}</style>

      {/* Barra de ações (não imprime) */}
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Printer size={14} />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Ficha para impressão */}
      <div className="ficha-wrapper max-w-2xl mx-auto">
        <div className="ficha-container bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Cabeçalho */}
          <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wider">
                {aluno.unidade.escola.nome}
              </p>
              <h1 className="text-lg font-bold mt-0.5">Ficha do Aluno</h1>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70">Data de emissão</p>
              <p className="text-sm font-medium">{hoje}</p>
            </div>
          </div>

          {/* Identificação */}
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex gap-5">
              {/* Foto */}
              <div className="shrink-0">
                {aluno.fotoUrl ? (
                  <Image
                    src={aluno.fotoUrl}
                    alt={aluno.nome}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-lg object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-slate-300">
                      {aluno.nome.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400">Foto</span>
                  </div>
                )}
              </div>

              {/* Dados principais */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{aluno.nome}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                  <span>
                    <span className="font-medium">Unidade:</span> {aluno.unidade.nome}
                  </span>
                  {aluno.serie && (
                    <span>
                      <span className="font-medium">Série:</span> {aluno.serie}
                      {aluno.turma ? ` — Turma ${aluno.turma}` : ""}
                    </span>
                  )}
                  {aluno.professora && (
                    <span>
                      <span className="font-medium">Professor(a):</span>{" "}
                      {aluno.professora.usuario.nome}
                    </span>
                  )}
                </div>
                {/* Status + Disciplinas */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      aluno.status === "ATIVO"
                        ? "bg-emerald-100 text-emerald-700"
                        : aluno.status === "PAUSADO"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabel[aluno.status]}
                  </span>
                  {aluno.materias.map(({ materia }) => (
                    <span
                      key={materia.nome}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: materia.cor }}
                    >
                      {materia.nome}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dados pessoais */}
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
              Dados Pessoais
            </h3>
            <Linha
              label="Data de nascimento"
              valor={
                aluno.dataNascimento
                  ? new Date(aluno.dataNascimento).toLocaleDateString("pt-BR")
                  : null
              }
            />
            <Linha label="Responsável" valor={aluno.responsavel} />
            <Linha label="Telefone do responsável" valor={aluno.telefoneResponsavel} />
            <Linha label="E-mail do responsável" valor={aluno.emailResponsavel} />
          </div>

          {/* Endereço */}
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
              Endereço Residencial
            </h3>
            <Linha label="Endereço completo" valor={enderecoFinal || null} />
          </div>

          {/* Informações de cobrança */}
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
              Informações Financeiras
            </h3>
            <Linha
              label="Tipo de cobrança"
              valor={aluno.tipoCobranca ? tipoCobrancaLabel[aluno.tipoCobranca] : null}
            />
            <Linha
              label="Valor"
              valor={
                aluno.valorCobranca != null
                  ? aluno.valorCobranca.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : null
              }
            />
            <Linha
              label="Dia de vencimento"
              valor={aluno.diaPagamento ? `Todo dia ${aluno.diaPagamento}` : null}
            />
            <Linha label="Horário de aula" valor={aluno.horaAula} />
          </div>

          {/* Observações */}
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
              Observações
            </h3>
            {aluno.observacoes ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {aluno.observacoes}
              </p>
            ) : (
              <div className="h-16 border border-dashed border-slate-300 rounded-lg" />
            )}
          </div>

          {/* Assinaturas */}
          <div className="px-6 py-5">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">
              Assinaturas
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-b-2 border-slate-400 mb-2 h-10" />
                <p className="text-xs text-slate-500">Assinatura do Responsável</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {aluno.responsavel || "Responsável pelo aluno"}
                </p>
              </div>
              <div className="text-center">
                <div className="border-b-2 border-slate-400 mb-2 h-10" />
                <p className="text-xs text-slate-500">Assinatura do(a) Professor(a)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {aluno.professora?.usuario?.nome || "Professor(a) responsável"}
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="inline-block border-b border-slate-400 w-48 mb-1 h-8" />
              <p className="text-xs text-slate-500">Local e data</p>
            </div>
          </div>

          {/* Rodapé */}
          <div className="bg-slate-50 px-6 py-3 text-center">
            <p className="text-[11px] text-slate-400">
              Documento gerado pelo sistema EduGestão · {hoje}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

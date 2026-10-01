"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { isNativeApp, printDocument } from "@/lib/nativePrint";

type Item = {
  id:            string;
  aluno:         string;
  escola:        string;
  unidade:       string;
  professora:    string | null;
  competencia:   string;
  tipo:          string;
  parcela:       number;
  qtdAulas:      number | null;
  valorCobrado:  string;
  vencimento:    string;
  pago:          boolean;
  dataPagamento: string;
  observacao:    string | null;
};

export default function ReciboClient({
  itens, total, emissao,
}: {
  itens:   Item[];
  total:   string;
  emissao: string;
}) {
  const [imprimindo, setImprimindo] = useState(false);
  const [erroImpressao, setErroImpressao] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeApp()) window.print();
  }, []);

  async function imprimir() {
    setErroImpressao(null);
    setImprimindo(true);
    try {
      await printDocument();
    } catch (error) {
      setErroImpressao(error instanceof Error ? error.message : "Não foi possível abrir a impressão. Tente novamente.");
    } finally {
      setImprimindo(false);
    }
  }

  return (
    <>
      {/* Botão imprimir — oculto na impressão */}
      <div className="print:hidden max-w-3xl mx-auto flex justify-end px-4 sm:px-8 pt-4">
        <button
          onClick={imprimir}
          disabled={imprimindo}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          <Printer size={15} />
          {imprimindo ? "Abrindo impressão…" : "Imprimir"}
        </button>
      </div>
      {erroImpressao && (
        <p role="alert" className="print:hidden max-w-3xl mx-auto px-4 sm:px-8 pt-3 text-sm text-red-700">
          {erroImpressao}
        </p>
      )}

      <div className="max-w-3xl mx-auto p-4 sm:p-8 print:p-8 text-slate-800 font-sans">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row print:flex-row items-start justify-between gap-3 mb-6 pb-4 border-b-2 border-indigo-600">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700">EduGestão</h1>
            <p className="text-xs text-slate-500 mt-0.5">Gestão Educacional</p>
          </div>
          <div className="sm:text-right print:text-right">
            <p className="text-lg font-bold text-slate-700">Recibo de Pagamento</p>
            <p className="text-xs text-slate-400 mt-0.5">Emitido em {emissao}</p>
          </div>
        </div>

        {/* Itens */}
        <div className="space-y-4 mb-6">
          {itens.map((item, idx) => (
            <div key={item.id} className="border border-slate-200 rounded-xl p-4 print:break-inside-avoid">
              {itens.length > 1 && (
                <p className="text-xs font-semibold text-indigo-600 mb-2">#{idx + 1}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <Row label="Aluno"          value={item.aluno} />
                <Row label="Escola / Turma" value={`${item.escola} · ${item.unidade}`} />
                {item.professora && <Row label="Professor(a)" value={item.professora} />}
                <Row label="Competência"    value={item.competencia} />
                <Row label="Tipo cobrança"  value={item.tipo} />
                {(item.tipo === "Quinzenal" || item.tipo === "Semanal") && (
                  <Row label="Parcela" value={`${item.parcela}ª`} />
                )}
                {item.qtdAulas !== null && (
                  <Row label="Qtd. de aulas" value={String(item.qtdAulas)} />
                )}
                <Row label="Vencimento" value={item.vencimento} />
                <Row
                  label="Status"
                  value={item.pago ? `Pago em ${item.dataPagamento}` : "Pendente"}
                  highlight={item.pago ? "green" : "red"}
                />
                <Row label="Valor" value={item.valorCobrado} bold />
                {item.observacao && (
                  <div className="sm:col-span-2 print:col-span-2 mt-1 break-words">
                    <span className="text-xs font-medium text-slate-500">Observação: </span>
                    <span className="text-xs text-slate-600">{item.observacao}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        {itens.length > 1 && (
          <div className="flex justify-end mb-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-6 py-3 text-right">
              <p className="text-xs text-indigo-500 font-medium">Total ({itens.length} recibos)</p>
              <p className="text-xl font-bold text-indigo-700 mt-0.5">{total}</p>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="border-t border-slate-200 pt-4 mt-4 text-center">
          <p className="text-xs text-slate-400">
            Este documento é um comprovante gerado pelo sistema EduGestão.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 mt-8">
                <p className="text-xs text-slate-500">Assinatura do Responsável</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-2 mt-8">
                <p className="text-xs text-slate-500">Assinatura do Professor(a)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({
  label, value, bold, highlight,
}: {
  label:      string;
  value:      string;
  bold?:      boolean;
  highlight?: "green" | "red";
}) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="text-xs font-medium text-slate-500 shrink-0 w-32">{label}:</span>
      <span
        className={`min-w-0 flex-1 break-words text-xs ${bold ? "font-bold text-slate-800" : "text-slate-700"} ${
          highlight === "green" ? "text-emerald-700 font-medium" :
          highlight === "red"   ? "text-amber-700 font-medium"   : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

"use client";

export type ParcelaGerada = {
  parcela: number;
  dataVencimento: string; // ISO
  valorCobrado: number;
  quantidadeAulas: number;
  pagoAnteriormente: number | null;
};

type Props = {
  parcelas: ParcelaGerada[];
  onFechar: () => void;
};

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function formatarValor(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Aviso informativo (sem opção de cancelar) — a cobrança já foi gerada quando
// esse modal aparece, ele só comunica o resultado.
export default function PagamentoGeradoModal({ parcelas, onFechar }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Cobrança gerada</h2>
        <p className="text-sm text-slate-600">
          A cobrança a seguir foi gerada ou atualizada:
        </p>

        <div className="space-y-3 mt-3">
          {parcelas.map((p) => (
            <div key={p.parcela} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <div className="flex justify-between text-slate-700">
                <span>Parcela {p.parcela} — venc. {formatarData(p.dataVencimento)}</span>
                <strong>{formatarValor(p.valorCobrado)}</strong>
              </div>
              <div className="text-slate-500 text-xs mt-0.5">
                {p.quantidadeAulas} aula{p.quantidadeAulas === 1 ? "" : "s"}
              </div>
              {p.pagoAnteriormente !== null && (
                <p className="text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 text-xs">
                  Atenção: esta parcela já estava paga ({formatarValor(p.pagoAnteriormente)}) e o valor cobrado foi atualizado para {formatarValor(p.valorCobrado)}.
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onFechar}
          className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

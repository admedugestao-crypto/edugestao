"use client";

export type ParcelaGerada = {
  parcela: number;
  dataVencimento: string; // ISO
  valorCobrado: number;
  quantidadeAulas: number;
  pagoAnteriormente: number | null;
};

type Props = {
  pagamento: ParcelaGerada;
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
// esse modal aparece, ele só comunica o resultado. Cada pagamento cobre
// exatamente 1 aula — não existe mais "Parcela N" pra mostrar (esse número
// hoje é só um contador interno, sem significado pro usuário).
export default function PagamentoGeradoModal({ pagamento, onFechar }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Cobrança gerada</h2>
        <p className="text-sm text-slate-600">
          A cobrança desta aula foi gerada ou atualizada:
        </p>

        <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm mt-3">
          <div className="flex justify-between text-slate-700">
            <span>Vencimento: {formatarData(pagamento.dataVencimento)}</span>
            <strong>{formatarValor(pagamento.valorCobrado)}</strong>
          </div>
          {pagamento.pagoAnteriormente !== null && (
            <p className="text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 text-xs">
              Atenção: este pagamento já estava marcado como pago ({formatarValor(pagamento.pagoAnteriormente)}) e o valor foi atualizado para {formatarValor(pagamento.valorCobrado)}.
            </p>
          )}
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

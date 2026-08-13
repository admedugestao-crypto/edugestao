"use client";

import { useCallback, useRef, useState } from "react";
import type { ParcelaGerada } from "@/components/PagamentoGeradoModal";

// Mostra um aviso informativo (sem opção de cancelar) depois que uma ação já
// gerou/atualizou uma cobrança (`pagamentoGerado` vindo da resposta da API —
// sempre no máximo 1, já que cada aula gera exatamente 1 pagamento).
// `aoFechar`, se passado, roda quando o usuário fecha o aviso — útil quando a
// ação original navegaria pra outra tela e essa navegação precisa esperar o
// usuário ver o aviso primeiro.
export function usePagamentoGeradoInfo() {
  const [pagamento, setPagamento] = useState<ParcelaGerada | null>(null);
  const aoFecharRef = useRef<(() => void) | null>(null);

  const mostrar = useCallback((p: ParcelaGerada | null | undefined, aoFechar?: () => void) => {
    if (p) {
      aoFecharRef.current = aoFechar ?? null;
      setPagamento(p);
    } else {
      aoFechar?.();
    }
  }, []);

  const fechar = useCallback(() => {
    setPagamento(null);
    const cb = aoFecharRef.current;
    aoFecharRef.current = null;
    cb?.();
  }, []);

  return { pagamento, mostrar, fechar };
}

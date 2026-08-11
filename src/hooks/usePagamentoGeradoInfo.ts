"use client";

import { useCallback, useRef, useState } from "react";
import type { ParcelaGerada } from "@/components/PagamentoGeradoModal";

// Mostra um aviso informativo (sem opção de cancelar) depois que uma ação já
// gerou/atualizou uma cobrança (`pagamentoGerado` vindo da resposta da API).
// `aoFechar`, se passado, roda quando o usuário fecha o aviso — útil quando a
// ação original navegaria pra outra tela e essa navegação precisa esperar o
// usuário ver o aviso primeiro.
export function usePagamentoGeradoInfo() {
  const [parcelas, setParcelas] = useState<ParcelaGerada[] | null>(null);
  const aoFecharRef = useRef<(() => void) | null>(null);

  const mostrar = useCallback((p: ParcelaGerada[] | null | undefined, aoFechar?: () => void) => {
    if (p && p.length > 0) {
      aoFecharRef.current = aoFechar ?? null;
      setParcelas(p);
    } else {
      aoFechar?.();
    }
  }, []);

  const fechar = useCallback(() => {
    setParcelas(null);
    const cb = aoFecharRef.current;
    aoFecharRef.current = null;
    cb?.();
  }, []);

  return { parcelas, mostrar, fechar };
}
